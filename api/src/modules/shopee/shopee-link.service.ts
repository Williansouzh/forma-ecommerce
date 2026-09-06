import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ShopeeProductLink,
  ShopeeProductLinkDocument,
  type LinkStatus,
} from "./schemas/shopee-product-link.schema";
import {
  Product,
  ProductDocument,
} from "../products/schemas/product.schema";

/** Um anúncio da Shopee, do jeito que o painel precisa vê-lo. */
export interface RemoteListing {
  itemId: string;
  modelId: string;
  name: string;
  sku: string;
  stock?: number;
}

/** Uma associação PROPOSTA pelo casamento de SKU — nunca aplicada sozinha. */
export interface LinkSuggestion {
  productId: string;
  variantId: string;
  productName: string;
  internalSku: string;
  listing: RemoteListing;
  /** `sku-exato` casa sozinho; `ambiguo` exige uma pessoa decidir. */
  confidence: "sku-exato" | "ambiguo";
  reason: string;
}

@Injectable()
export class ShopeeLinkService {
  constructor(
    @InjectModel(ShopeeProductLink.name)
    private readonly linkModel: Model<ShopeeProductLinkDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async list(shopId: string): Promise<ShopeeProductLink[]> {
    return this.linkModel.find({ shopId }).sort({ updatedAt: -1 }).lean<ShopeeProductLink[]>();
  }

  /** As associações que o worker deve sincronizar sozinho. */
  async listSyncable(shopId: string): Promise<ShopeeProductLink[]> {
    return this.linkModel
      .find({ shopId, autoSync: true, status: { $in: ["active", "error"] } })
      .lean<ShopeeProductLink[]>();
  }

  async findBySku(
    shopId: string,
    productId: string,
    variantId: string,
  ): Promise<ShopeeProductLink | null> {
    return this.linkModel
      .findOne({ shopId, productId, variantId })
      .lean<ShopeeProductLink | null>();
  }

  async findByListing(
    shopId: string,
    itemId: string,
    modelId: string,
  ): Promise<ShopeeProductLink | null> {
    return this.linkModel
      .findOne({ shopId, itemId, modelId })
      .lean<ShopeeProductLink | null>();
  }

  /**
   * Cria ou atualiza uma associação. É sempre uma decisão humana — o
   * casamento automático só PROPÕE, e a proposta entra como `pending`.
   */
  async upsert(input: {
    shopId: string;
    productId: string;
    variantId?: string;
    itemId: string;
    modelId?: string;
    shopeeSku?: string;
    internalSku?: string;
    status?: LinkStatus;
    safetyMargin?: number;
    autoSync?: boolean;
  }): Promise<ShopeeProductLink> {
    const product = await this.productModel.findById(input.productId).lean<{
      _id: unknown;
      variants?: { id: string }[];
    } | null>();
    if (!product) throw new NotFoundException("Produto interno não encontrado.");

    const variantId = input.variantId ?? "";
    if (variantId && !product.variants?.some((v) => v.id === variantId)) {
      throw new BadRequestException(
        `A variação ${variantId} não existe neste produto.`,
      );
    }
    // Produto COM variação não pode ter associação no nível do produto: o
    // saldo do pai é a soma das variações, e mandá-lo para um `model_id`
    // anunciaria o estoque das irmãs no lugar do dele.
    if (!variantId && (product.variants?.length ?? 0) > 0) {
      throw new BadRequestException(
        "Este produto tem variações: associe cada variação ao seu model_id.",
      );
    }

    const updated = await this.linkModel
      .findOneAndUpdate(
        { shopId: input.shopId, productId: input.productId, variantId },
        {
          $set: {
            itemId: input.itemId,
            modelId: input.modelId ?? "0",
            ...(input.shopeeSku !== undefined ? { shopeeSku: input.shopeeSku } : {}),
            ...(input.internalSku !== undefined ? { internalSku: input.internalSku } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(input.safetyMargin !== undefined
              ? { safetyMargin: Math.max(0, Math.trunc(input.safetyMargin)) }
              : {}),
            ...(input.autoSync !== undefined ? { autoSync: input.autoSync } : {}),
          },
          $setOnInsert: { shopId: input.shopId, productId: input.productId, variantId },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean<ShopeeProductLink>();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.linkModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException("Associação não encontrada.");
  }

  /** Resultado de uma sincronização, para o painel e a auditoria. */
  async recordSyncSuccess(id: string, pushedStock: number): Promise<void> {
    await this.linkModel
      .updateOne(
        { _id: id },
        {
          $set: {
            status: "active",
            lastPushedStock: pushedStock,
            lastSyncedAt: new Date(),
            failureCount: 0,
          },
          $unset: { lastError: "" },
        },
      )
      .exec();
  }

  async recordSyncFailure(id: string, error: string): Promise<void> {
    await this.linkModel
      .updateOne(
        { _id: id },
        {
          $set: { status: "error", lastError: error.slice(0, 300) },
          $inc: { failureCount: 1 },
        },
      )
      .exec();
  }

  async recordRemoteStock(id: string, remoteStock: number): Promise<void> {
    await this.linkModel
      .updateOne(
        { _id: id },
        { $set: { lastRemoteStock: remoteStock, lastRemoteCheckedAt: new Date() } },
      )
      .exec();
  }

  /**
   * Propõe associações comparando SKUs, sem aplicar nenhuma.
   *
   * A regra do enunciado, ao pé da letra: casa por SKU quando é seguro, e
   * marca como ambíguo quando não é. "Seguro" aqui significa **um** SKU
   * interno para **um** anúncio — dois candidatos com o mesmo SKU viram
   * `ambiguo`, porque escolher um deles no chute anunciaria o estoque errado.
   *
   * Nome nunca entra na conta.
   */
  async suggest(shopId: string, listings: RemoteListing[]): Promise<LinkSuggestion[]> {
    const [products, existing] = await Promise.all([
      this.productModel
        .find()
        .select("name slug variants")
        .lean<{ _id: unknown; name: string; slug: string; variants?: { id: string; name: string }[] }[]>(),
      this.linkModel.find({ shopId }).lean<ShopeeProductLink[]>(),
    ]);

    const linkedListings = new Set(existing.map((l) => `${l.itemId}:${l.modelId}`));
    const linkedSkus = new Set(existing.map((l) => `${l.productId}:${l.variantId}`));

    // O SKU interno de uma peça é o slug (produto simples) ou `slug/variação`.
    // A loja não tem campo de SKU próprio; usar o slug é honesto porque ele
    // já é único no banco, e a proposta ainda passa por confirmação humana.
    const bySku = new Map<string, { productId: string; variantId: string; productName: string }[]>();
    for (const product of products) {
      const productId = String(product._id);
      const entries =
        product.variants && product.variants.length > 0
          ? product.variants.map((v) => ({
              sku: `${product.slug}/${v.id}`,
              variantId: v.id,
              productName: `${product.name} — ${v.name}`,
            }))
          : [{ sku: product.slug, variantId: "", productName: product.name }];

      for (const entry of entries) {
        const key = normalizeSku(entry.sku);
        const list = bySku.get(key) ?? [];
        list.push({ productId, variantId: entry.variantId, productName: entry.productName });
        bySku.set(key, list);
      }
    }

    const suggestions: LinkSuggestion[] = [];
    for (const listing of listings) {
      if (linkedListings.has(`${listing.itemId}:${listing.modelId}`)) continue;
      if (!listing.sku.trim()) continue;

      const candidates = bySku.get(normalizeSku(listing.sku)) ?? [];
      const free = candidates.filter(
        (c) => !linkedSkus.has(`${c.productId}:${c.variantId}`),
      );
      if (free.length === 0) continue;

      const ambiguous = free.length > 1;
      for (const candidate of free) {
        suggestions.push({
          productId: candidate.productId,
          variantId: candidate.variantId,
          productName: candidate.productName,
          internalSku: listing.sku,
          listing,
          confidence: ambiguous ? "ambiguo" : "sku-exato",
          reason: ambiguous
            ? `${free.length} peças internas têm o SKU "${listing.sku}" — escolha qual.`
            : `SKU "${listing.sku}" bate exatamente com uma peça.`,
        });
      }
    }
    return suggestions;
  }
}

/** Comparação de SKU tolerante a caixa e espaço, e a nada além disso. */
function normalizeSku(value: string): string {
  return value.trim().toLowerCase();
}
