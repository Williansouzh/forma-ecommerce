import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomUUID } from "crypto";
import { Order, OrderDocument, OrderStatus } from "./schemas/order.schema";
import { CreateOrderDto } from "./dto/order.dto";
import { InventoryService } from "../inventory/inventory.service";
import { ShopeeInventoryService } from "../shopee/shopee-inventory.service";
import { ProductsService } from "../products/products.service";
import { SettingsService } from "../settings/settings.service";
import { priceOrder, type CatalogEntry } from "./pricing";

export interface OrderQuery {
  status?: string;
  limit?: number;
}

type RawOrder = Omit<Order, "id"> & { _id?: Types.ObjectId | string };

const CODE_PREFIX = "C3D-";
const FIRST_CODE = 4801;

/** A chave de reserva de um item do site — o par com a da Shopee. */
function reservationKeyFor(code: string, productId: string, variantId: string): string {
  return `SITE:${code}:${productId}:${variantId}`;
}

/** Estados em que a peça já saiu do estoque de vez. */
const CONSUMED_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "printing",
  "finishing",
  "shipped",
  "delivered",
];

/**
 * Os pedidos da loja — e, desde a integração com o marketplace, o gatilho do
 * estoque.
 *
 * O que mudou aqui: antes, criar e pagar um pedido não tocava em estoque
 * nenhum. Agora o ciclo do pedido dirige o domínio de estoque, e é isso que
 * torna este sistema a fonte oficial do saldo — sem essa ligação, "mandar o
 * saldo para a Shopee" mandaria um número que ninguém mantém.
 *
 * Ordem das operações, sempre a mesma: o estoque primeiro, o canal externo
 * depois e ENFILEIRADO. Uma Shopee fora do ar não pode derrubar um checkout
 * nem desfazer uma venda já confirmada.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly inventory: InventoryService,
    private readonly shopeeStock: ShopeeInventoryService,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
  ) {}

  async findAll(query: OrderQuery): Promise<Order[]> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    let cursor = this.orderModel.find(filter).sort({ createdAt: -1 });
    if (query.limit && query.limit > 0) cursor = cursor.limit(query.limit);

    const rows = await cursor.lean<RawOrder[]>();
    return rows.map(mapId);
  }

  /**
   * Cria o pedido e COMPROMETE o estoque de cada item.
   *
   * A reserva vem depois de o pedido existir porque a chave dela é o código
   * do pedido — é o que torna reservar idempotente e permite achar a reserva
   * de novo no pagamento e no cancelamento.
   *
   * Falta de estoque não derruba o pedido: o pedido é registrado, os itens
   * sem saldo ficam anotados no log e o ateliê decide. Recusar aqui perderia
   * a venda de uma peça que costuma sair sob encomenda — e produto sem saldo
   * controlado (`stock` ausente) é justamente o caso normal desta loja.
   */
  async create(dto: CreateOrderDto): Promise<Order> {
    const correlationId = randomUUID();

    /*
     * O preço sai do catálogo, não do corpo da requisição.
     *
     * Esta rota é pública — o checkout da loja não tem sessão de admin — e
     * antes gravava `price`, `subtotal` e `total` exatamente como chegaram.
     * A preferência do Mercado Pago é montada a partir do que foi gravado,
     * então mandar `price: 1` cobrava um centavo de verdade por uma peça de
     * R$ 129,00, com o webhook confirmando um pagamento legitimamente
     * aprovado e o estoque baixando em seguida.
     */
    const catalog = await this.catalogFor(dto.items.map((item) => item.productId));
    const rules = await this.settings.get();
    const priced = priceOrder(dto.items, catalog, dto.paymentMethod, {
      freeShippingThreshold: rules.freeShippingThreshold,
      pixDiscountPercent: rules.pixDiscountPercent,
    });

    // Divergência não derruba o pedido — o cliente pode estar com o carrinho
    // velho, e recalcular já resolve. Mas fica registrado: em volume, é o
    // sinal de que alguém está mexendo no corpo da requisição.
    if (typeof dto.total === "number" && dto.total !== priced.total) {
      this.logger.warn(
        `Total recalculado: cliente informou ${dto.total}, catálogo diz ${priced.total}.`,
      );
    }

    const created = await this.orderModel.create({
      ...dto,
      ...priced,
      status: "pending",
      code: await this.nextCode(),
    });

    const order = mapId(created.toObject() as unknown as RawOrder);
    await this.reserveItems(order, correlationId);
    return order;
  }

  /**
   * As peças do pedido, indexadas por id. Uma consulta só: pedido com cinco
   * itens não pode virar cinco idas ao banco no meio do checkout.
   */
  private async catalogFor(ids: string[]): Promise<Map<string, CatalogEntry>> {
    const unique = [...new Set(ids)];
    const rows = await this.products.findManyByIds(unique);
    return new Map(rows.map((row) => [row.id, row]));
  }

  async findByCode(code: string): Promise<Order | null> {
    const row = await this.orderModel.findOne({ code }).lean<RawOrder | null>();
    return row ? mapId(row) : null;
  }

  /**
   * Usado pelo webhook de pagamento, que conhece o pedido pelo código.
   *
   * A guarda `status: "pending"` continua sendo o que impede a notificação
   * repetida de agir duas vezes — e agora ela protege também a BAIXA do
   * estoque, não só o campo de status.
   */
  async markPaidByCode(code: string): Promise<Order | null> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { code, status: "pending" },
        { $set: { status: "paid" } },
        { new: true },
      )
      .lean<RawOrder | null>();
    if (!updated) return null;

    const order = mapId(updated);
    await this.confirmItems(order, randomUUID());
    return order;
  }

  /**
   * Grava a cobrança Pix direta no pedido.
   *
   * Só preenche quando ainda não há — a guarda `pixCode: null` faz duas
   * chamadas simultâneas (clique duplo em "finalizar") não trocarem o código
   * que o cliente pode já ter copiado.
   */
  async attachPixCharge(
    code: string,
    charge: { pixCode: string; pixKey: string; pixReceiverName: string },
  ): Promise<Order | null> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { code, $or: [{ pixCode: { $exists: false } }, { pixCode: "" }, { pixCode: null }] },
        { $set: charge },
        { new: true },
      )
      .lean<RawOrder | null>();
    return updated ? mapId(updated) : null;
  }

  async attachPayment(
    code: string,
    preferenceId: string,
    paymentUrl: string,
  ): Promise<Order | null> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { code },
        { $set: { paymentPreferenceId: preferenceId, paymentUrl } },
        { new: true },
      )
      .lean<RawOrder | null>();
    return updated ? mapId(updated) : null;
  }

  /**
   * Troca a etapa pelo painel, aplicando o efeito no estoque quando a
   * transição pede um.
   *
   * O efeito é decidido pelo estado ANTERIOR, não só pelo novo: cancelar um
   * pedido que estava "aguardando pagamento" solta a reserva, e cancelar um
   * que já estava pago devolve a peça ao estoque. Olhar só o destino trataria
   * os dois como a mesma coisa e devolveria estoque que nunca saiu.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Pedido não encontrado");
    }

    const previous = await this.orderModel.findById(id).lean<RawOrder | null>();
    if (!previous) throw new NotFoundException("Pedido não encontrado");

    const updated = await this.orderModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean<RawOrder | null>();
    if (!updated) throw new NotFoundException("Pedido não encontrado");

    const order = mapId(updated);
    const correlationId = randomUUID();
    const before = previous.status;

    if (status === "cancelled" && before !== "cancelled") {
      await this.cancelItems(order, before, correlationId);
    } else if (CONSUMED_STATUSES.includes(status) && before === "pending") {
      // O ateliê marcou como pago na mão (Pix combinado, dinheiro no balcão).
      // A baixa é a mesma do webhook.
      await this.confirmItems(order, correlationId);
    }

    return order;
  }

  // ── Ligação com o estoque ──────────────────────────────────────────────

  /**
   * Os SKUs de um pedido. Itens importados sem associação carregam um
   * `productId` sintético (`shopee:...`), que não é um id do Mongo e não tem
   * saldo a mexer — por isso são filtrados aqui e não lá dentro.
   */
  private skusOf(order: Order): { productId: string; variantId: string; quantity: number }[] {
    return order.items
      .filter((item) => Types.ObjectId.isValid(item.productId))
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? "",
        quantity: item.quantity,
      }));
  }

  private async reserveItems(order: Order, correlationId: string): Promise<void> {
    for (const sku of this.skusOf(order)) {
      const result = await this.inventory.reserve(
        {
          productId: sku.productId,
          variantId: sku.variantId,
          quantity: sku.quantity,
          key: reservationKeyFor(order.code, sku.productId, sku.variantId),
        },
        { channel: "SITE", orderCode: order.code, correlationId },
      );
      if (!result.ok) {
        this.logger.warn(
          `[${correlationId}] ${order.code}: sem estoque para ${sku.productId}` +
            `${sku.variantId ? `/${sku.variantId}` : ""} (disponível ${result.available}).`,
        );
      }
      await this.notifyChannels(sku, correlationId);
    }
  }

  private async confirmItems(order: Order, correlationId: string): Promise<void> {
    for (const sku of this.skusOf(order)) {
      const key = reservationKeyFor(order.code, sku.productId, sku.variantId);
      // Reservar antes de confirmar cobre o pedido cuja reserva não existe —
      // criado antes desta integração, ou importado já pago.
      await this.inventory.reserve(
        {
          productId: sku.productId,
          variantId: sku.variantId,
          quantity: sku.quantity,
          key,
        },
        { channel: "SITE", orderCode: order.code, correlationId },
      );
      const result = await this.inventory.confirmSale(key, {
        channel: "SITE",
        orderCode: order.code,
        correlationId,
      });
      if (!result.ok && result.reason !== "already") {
        this.logger.warn(
          `[${correlationId}] ${order.code}: não foi possível baixar ${sku.productId} (${result.reason}).`,
        );
      }
      await this.notifyChannels(sku, correlationId);
    }
  }

  private async cancelItems(
    order: Order,
    previousStatus: OrderStatus,
    correlationId: string,
  ): Promise<void> {
    const alreadyConsumed = CONSUMED_STATUSES.includes(previousStatus);
    for (const sku of this.skusOf(order)) {
      const key = reservationKeyFor(order.code, sku.productId, sku.variantId);
      const context = { channel: "SITE" as const, orderCode: order.code, correlationId };
      if (alreadyConsumed) {
        await this.inventory.returnToStock(key, context);
      } else {
        await this.inventory.release(key, context);
      }
      await this.notifyChannels(sku, correlationId);
    }
  }

  /**
   * Avisa os canais externos de que o saldo mudou.
   *
   * ENFILEIRA, não chama: é a venda do site atualizando a Shopee, e o
   * enunciado é explícito em que uma falha do marketplace não pode corromper
   * a venda local. Também nunca lança — o pedido já está gravado, e um erro
   * aqui só significa que a mensagem não entrou na fila, o que a conciliação
   * periódica corrige.
   */
  private async notifyChannels(
    sku: { productId: string; variantId: string },
    correlationId: string,
  ): Promise<void> {
    try {
      await this.shopeeStock.enqueueSync(
        { productId: sku.productId, variantId: sku.variantId },
        correlationId,
      );
    } catch (error) {
      this.logger.warn(
        `[${correlationId}] não foi possível enfileirar a sincronização da Shopee: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Sequência legível a partir do maior código já gravado. Um ateliê tem um
   * pedido por vez; se o volume crescer, trocar por uma coleção de contadores
   * com $inc, que é atômica.
   */
  private async nextCode(): Promise<string> {
    const last = await this.orderModel
      .findOne({ code: new RegExp(`^${CODE_PREFIX}\\d+$`) })
      .sort({ code: -1 })
      .lean<{ code?: string } | null>();
    const current = last?.code
      ? Number(last.code.slice(CODE_PREFIX.length))
      : FIRST_CODE - 1;
    return `${CODE_PREFIX}${current + 1}`;
  }
}

function mapId(row: RawOrder): Order {
  const { _id, __v, ...rest } = row as RawOrder & Record<string, unknown>;
  void __v;
  return { ...rest, id: String(_id) } as unknown as Order;
}
