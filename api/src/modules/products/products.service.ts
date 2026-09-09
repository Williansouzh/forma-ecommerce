import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomUUID } from "crypto";
import {
  Product,
  ProductDocument,
  canonicalCategory,
  categoryAliases,
} from "./schemas/product.schema";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { InventoryService } from "../inventory/inventory.service";

export interface ProductQuery {
  category?: string;
  q?: string;
  featured?: string;
  sort?: string;
  limit?: number;
  /** Só o painel. Ver o comentário do filtro em `findAll`. */
  includeUnpublished?: boolean;
}

type RawProduct = Omit<Product, "id"> & { _id?: Types.ObjectId | string };

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly inventory: InventoryService,
  ) {}

  async findAll(query: ProductQuery): Promise<Product[]> {
    const filter: Record<string, unknown> = {};

    /*
     * Peça despublicada não sai daqui sem sessão de admin.
     *
     * O painel sempre prometeu que "peças despublicadas somem da loja", mas
     * quem cumpria isso era só a interface — a rota devolvia tudo, então
     * rascunho, preço e nome de um lançamento ficavam legíveis para qualquer
     * um que chamasse a API direto. Como o painel lê ESTA MESMA rota, o corte
     * depende de quem pergunta, não da rota.
     *
     * `$ne: false` e não `true`: peça antiga, gravada antes do campo existir,
     * não tem `isAvailable` e não pode sumir da loja por causa disso.
     */
    if (!query.includeUnpublished) {
      filter.isAvailable = { $ne: false };
    }
    // `$in` com os apelidos em vez de igualdade: enquanto o script de
    // migração não rodou, a coleção "Casa e decoração" precisa devolver
    // também as peças que ainda estão gravadas como `utilidades`.
    if (query.category) {
      filter.category = { $in: categoryAliases(query.category) };
    }
    if (query.featured === "1" || query.featured === "true") {
      filter.isFeatured = true;
    }
    if (query.q) {
      const regex = new RegExp(
        query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      filter.$or = [
        { name: regex },
        { shortDescription: regex },
        { tags: regex },
        { category: regex },
      ];
    }

    let cursor = this.productModel.find(filter);
    switch (query.sort) {
      case "price-asc":
        cursor = cursor.sort({ price: 1 });
        break;
      case "price-desc":
        cursor = cursor.sort({ price: -1 });
        break;
      case "newest":
        cursor = cursor.sort({ createdAt: -1 });
        break;
      default:
        cursor = cursor.sort({ isFeatured: -1, createdAt: -1 });
    }
    if (query.limit && query.limit > 0) {
      cursor = cursor.limit(query.limit);
    }

    const rows = await cursor.lean<RawProduct[]>();
    return rows.map(mapId);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await this.productModel
      .findOne({ slug })
      .lean<RawProduct | null>();
    return row ? mapId(row) : null;
  }

  /**
   * As peças de um pedido, numa consulta só — é o que o cálculo de preço do
   * checkout usa para não confiar no valor que o cliente mandou.
   *
   * Id inválido é descartado em vez de estourar: `Types.ObjectId` recusa
   * string qualquer, e um `productId` inventado no corpo da requisição não
   * pode virar 500. Quem trata a ausência é `priceOrder`, que responde 400
   * dizendo qual peça não existe.
   */
  async findManyByIds(ids: string[]): Promise<(Product & { id: string })[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];
    const rows = await this.productModel
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } })
      .lean<RawProduct[]>();
    // `mapId` já devolve `id` em tempo de execução; o tipo `Product` do
    // schema declara só `_id`, então o retorno anota o que de fato existe.
    return rows.map(mapId) as (Product & { id: string })[];
  }

  async findRelated(
    slug: string,
    category: string,
    limit = 4,
  ): Promise<Product[]> {
    const rows = await this.productModel
      .find({ slug: { $ne: slug }, category: { $in: categoryAliases(category) } })
      .limit(limit)
      .lean<RawProduct[]>();
    return rows.map(mapId);
  }

  async countByCategory(): Promise<Record<string, number>> {
    const rows = await this.productModel.aggregate<{
      _id: string;
      total: number;
    }>([{ $group: { _id: "$category", total: { $sum: 1 } } }]);
    // Dobra o legado no canônico: durante a janela de migração, uma peça em
    // `utilidades` tem de contar para "Casa e decoração", senão a vitrine
    // anuncia menos peças do que a coleção mostra.
    const totals: Record<string, number> = {};
    for (const row of rows) {
      const slug = canonicalCategory(row._id);
      totals[slug] = (totals[slug] ?? 0) + row.total;
    }
    return totals;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const created = await this.productModel.create({
      ...dto,
      slug: await this.uniqueSlug(dto.slug || dto.name),
    });
    return mapId(created.toObject() as unknown as RawProduct);
  }

  /**
   * Atualiza o cadastro. Quantidade NÃO é campo de cadastro.
   *
   * `stock` e `variants[].stock` são projeção do ledger: gravá-los aqui com um
   * `$set` produziria um número que a próxima venda sobrescreveria, e — pior —
   * um saldo sem lote, sem custo e sem linha de auditoria explicando de onde
   * veio. O painel continua editando o campo como sempre; o que mudou é que a
   * diferença vira um AJUSTE no domínio de estoque, com motivo e ator.
   *
   * Os outros campos seguem pelo caminho de antes.
   */
  async update(
    id: string,
    dto: UpdateProductDto,
    actor?: string,
  ): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Produto não encontrado");
    }

    const { stock, variants, ...rest } = dto as UpdateProductDto & {
      stock?: number;
      variants?: { id: string; stock?: number }[];
    };

    const before = await this.productModel.findById(id).lean<RawProduct | null>();
    if (!before) throw new NotFoundException("Produto não encontrado");

    /**
     * O saldo declarado precisa entrar no ledger ANTES do `$set`.
     *
     * O `$set` reescreve o array de variações inteiro, e o schema repõe o
     * default `stock: 0` em cada uma. Se o domínio de estoque ainda não
     * conhecesse aquele SKU, ele adotaria o zero como saldo de abertura e a
     * peça sumiria do estoque por causa de uma edição de NOME. `getStock`
     * força a adoção do saldo real primeiro.
     */
    await this.inventory.getStock({ productId: id, variantId: "" });
    for (const variant of before.variants ?? []) {
      await this.inventory.getStock({ productId: id, variantId: variant.id });
    }

    // As variações entram no `$set` porque carregam nome, cor e preço, mas o
    // `stock` de cada uma é substituído pelo valor projetado — o `$set` não
    // pode ser o caminho por onde uma quantidade muda.
    const set: Record<string, unknown> = { ...rest };
    if (variants) {
      const projected = new Map(
        (before.variants ?? []).map((variant) => [variant.id, variant.stock]),
      );
      set.variants = variants.map((variant) => ({
        ...variant,
        stock: projected.get(variant.id) ?? 0,
      }));
    }

    const updated = await this.productModel
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .lean<RawProduct | null>();
    if (!updated) throw new NotFoundException("Produto não encontrado");

    const correlationId = randomUUID();

    if (typeof stock === "number") {
      await this.applyStockEdit(id, "", stock, actor, correlationId);
    }
    for (const variant of variants ?? []) {
      if (typeof variant.stock === "number") {
        await this.applyStockEdit(id, variant.id, variant.stock, actor, correlationId);
      }
    }

    // Relê: o ajuste projetou o saldo de volta depois do `$set` acima.
    const fresh = await this.productModel.findById(id).lean<RawProduct | null>();
    return mapId(fresh ?? updated);
  }

  /**
   * Transforma "o campo agora vale N" na diferença correspondente.
   *
   * Ajustar para MENOS do que existe em lote é recusado pelo domínio, e a
   * recusa sobe para o painel — melhor um erro claro que um saldo que o ledger
   * não sustenta.
   */
  private async applyStockEdit(
    productId: string,
    variantId: string,
    target: number,
    actor: string | undefined,
    correlationId: string,
  ): Promise<void> {
    const sku = { productId, variantId };
    const current = await this.inventory.getStock(sku);
    const delta = Math.trunc(target) - current.available;
    if (delta === 0) return;

    await this.inventory.adjust(sku, delta, {
      channel: "ADMIN",
      actor,
      reason: `Ajuste pelo cadastro do produto (${current.available} → ${Math.trunc(target)})`,
      correlationId,
    });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Produto não encontrado");
    }
    const deleted = await this.productModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException("Produto não encontrado");
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let counter = 2;
    while (await this.productModel.exists({ slug: candidate }).exec()) {
      candidate = `${root}-${counter++}`;
    }
    return candidate;
  }
}

function mapId(row: RawProduct): Product {
  const { _id, __v, ...rest } = row as RawProduct & Record<string, unknown>;
  void __v;
  return { ...rest, id: String(_id) } as unknown as Product;
}
