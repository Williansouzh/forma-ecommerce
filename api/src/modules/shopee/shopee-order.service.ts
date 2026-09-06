import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import {
  Order,
  OrderDocument,
} from "../orders/schemas/order.schema";
import { InventoryService } from "../inventory/inventory.service";
import { OutboxService } from "../outbox/outbox.service";
import { ShopeeApiClient, isAuthError } from "./shopee-api.client";
import { ShopeeAuthService } from "./shopee-auth.service";
import { ShopeeLinkService } from "./shopee-link.service";
import { ShopeeInventoryService } from "./shopee-inventory.service";
import {
  ShopeeEvent,
  ShopeeEventDocument,
} from "./schemas/shopee-event.schema";
import type { ShopeeProductLink } from "./schemas/shopee-product-link.schema";
import {
  effectOnFirstSight,
  isStaleTransition,
  mapShopeeStatus,
  type ShopeeOrderStatus,
  isShopeeOrderStatus,
} from "./shopee-status.map";
import {
  mapShopeeOrder,
  reservationKeyFor,
  type MappedOrder,
  type ShopeeOrderDetail,
} from "./mappers/shopee-order.mapper";

export const ORDER_SYNC_TOPIC = "shopee.order.sync";

export interface OrderSyncPayload extends Record<string, unknown> {
  shopId: string;
  orderSn: string;
  /** O status que o push anunciou. A verdade vem da API, não daqui. */
  hintedStatus?: string;
  pushCode?: number;
  correlationId: string;
}

export interface ProcessResult {
  handled: boolean;
  reason: string;
  orderCode?: string;
}

interface OrderListResponse {
  order_list?: { order_sn?: string; order_status?: string }[];
  more?: boolean;
  next_cursor?: string;
}

interface OrderDetailResponse {
  order_list?: ShopeeOrderDetail[];
}

const CODE_PREFIX = "SHP-";

/**
 * A ponte pedido-da-Shopee → pedido interno → estoque.
 *
 * Três travas independentes protegem contra baixa dupla, e é de propósito que
 * sejam três: cada uma cobre uma falha diferente.
 *
 * 1. `ShopeeEvent.key` único — o MESMO evento não roda duas vezes.
 * 2. `externalRef` único no pedido — o mesmo `order_sn` não vira dois pedidos.
 * 3. A transição da reserva (`held → consumed`) — mesmo que 1 e 2 falhem, o
 *    estoque só baixa uma vez.
 *
 * A terceira é a que realmente segura: as duas primeiras dependem de o evento
 * chegar do jeito esperado, e a terceira não depende de nada externo.
 */
@Injectable()
export class ShopeeOrderService {
  private readonly logger = new Logger(ShopeeOrderService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(ShopeeEvent.name)
    private readonly eventModel: Model<ShopeeEventDocument>,
    private readonly inventory: InventoryService,
    private readonly links: ShopeeLinkService,
    private readonly auth: ShopeeAuthService,
    private readonly api: ShopeeApiClient,
    private readonly stock: ShopeeInventoryService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Enfileira o processamento de um pedido. O webhook chama isto e responde
   * na hora — notificação que demora vira reenvio, e reenvio vira trabalho
   * repetido.
   */
  async enqueue(payload: OrderSyncPayload): Promise<void> {
    await this.outbox.enqueue({
      topic: ORDER_SYNC_TOPIC,
      // Por STATUS, não só por pedido: um pedido que anda de READY_TO_SHIP
      // para CANCELLED precisa das duas mensagens. Deduplicar só por
      // `order_sn` engoliria a segunda.
      dedupeKey: `${ORDER_SYNC_TOPIC}:${payload.shopId}:${payload.orderSn}:${payload.hintedStatus ?? "unknown"}`,
      payload,
      correlationId: payload.correlationId,
    });
  }

  /**
   * Processa um pedido de ponta a ponta.
   *
   * NUNCA confia no corpo do push: relê o pedido em `get_order_detail`. É a
   * mesma postura do webhook do Mercado Pago aqui — a notificação diz que
   * algo mudou, e quem diz o que mudou é a API autenticada.
   */
  async process(payload: OrderSyncPayload): Promise<ProcessResult> {
    const detail = await this.fetchOrderDetail(payload.shopId, payload.orderSn, payload.correlationId);
    if (!detail) {
      return { handled: false, reason: `pedido ${payload.orderSn} não encontrado na Shopee` };
    }

    const remoteStatus = detail.order_status?.trim() ?? "";
    if (!isShopeeOrderStatus(remoteStatus)) {
      await this.recordEvent(payload, remoteStatus || "desconhecido", "ignored",
        `status "${remoteStatus}" não está no mapeamento`);
      return { handled: false, reason: `status desconhecido: ${remoteStatus}` };
    }

    // A chave de idempotência do enunciado. O índice único faz o trabalho: se
    // outro worker já gravou este evento, aqui volta `false` e paramos.
    const claimed = await this.claimEvent(payload, remoteStatus);
    if (!claimed) {
      return { handled: false, reason: `evento ${remoteStatus} de ${payload.orderSn} já processado` };
    }

    try {
      const result = await this.apply(payload, detail, remoteStatus);
      await this.eventModel
        .updateOne(
          { key: this.eventKey(payload.shopId, payload.orderSn, remoteStatus) },
          { $set: { status: result.handled ? "processed" : "ignored", outcome: result.reason } },
        )
        .exec();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.eventModel
        .updateOne(
          { key: this.eventKey(payload.shopId, payload.orderSn, remoteStatus) },
          { $set: { status: "failed", outcome: message.slice(0, 300) } },
        )
        .exec();
      throw error;
    }
  }

  /** O que fazer com o pedido, decidido pelo mapeamento e nada mais. */
  private async apply(
    payload: OrderSyncPayload,
    detail: ShopeeOrderDetail,
    remoteStatus: ShopeeOrderStatus,
  ): Promise<ProcessResult> {
    const mapping = mapShopeeStatus(remoteStatus)!;
    const linksByListing = await this.loadLinks(payload.shopId);
    const mapped = mapShopeeOrder(detail, linksByListing);
    if (!mapped) return { handled: false, reason: "pedido sem order_sn utilizável" };

    const existing = await this.orderModel
      .findOne({
        "externalRef.source": "shopee",
        "externalRef.shopId": payload.shopId,
        "externalRef.orderSn": mapped.orderSn,
      })
      .lean<Order | null>();

    /**
     * Evento fora de ordem: a Shopee não garante a ordem de entrega dos
     * pushes. Um `READY_TO_SHIP` chegando depois de um `SHIPPED` já
     * processado faria o pedido regredir e o `confirm` tentar baixar de novo.
     */
    const previous = existing?.externalRef?.remoteStatus;
    if (previous && isStaleTransition(previous as ShopeeOrderStatus, remoteStatus)) {
      return {
        handled: false,
        reason: `evento ${remoteStatus} chegou atrasado (já em ${previous})`,
        orderCode: existing?.code,
      };
    }

    const order = existing ?? (await this.createOrder(payload.shopId, mapped));

    // Pedido nunca visto antes que já chega adiantado no ciclo precisa baixar
    // o estoque agora — o `READY_TO_SHIP` que teria baixado se perdeu.
    const effect = previous ? mapping.effect : effectOnFirstSight(remoteStatus);

    // Efeito no estoque ANTES do status: se a baixa falhar, o pedido não pode
    // aparecer como "pago" — a ordem inversa mentiria no painel.
    const applied = await this.applyStockEffect(payload, mapped, order.code, effect);

    await this.orderModel
      .updateOne(
        { _id: order._id },
        {
          $set: {
            status: mapping.internal,
            "externalRef.remoteStatus": remoteStatus,
          },
        },
      )
      .exec();

    // O saldo mudou de um lado: o outro precisa saber. Enfileirado, nunca
    // chamado aqui — uma falha da Shopee não pode desfazer a venda local.
    for (const item of mapped.items) {
      if (!item.link) continue;
      await this.stock.enqueueSync(
        { productId: item.link.productId, variantId: item.link.variantId },
        payload.correlationId,
      );
    }

    const warning =
      mapped.unlinked.length > 0
        ? ` · ${mapped.unlinked.length} item(ns) sem associação: ${mapped.unlinked
            .map((i) => `${i.itemId}/${i.modelId}`)
            .join(", ")}`
        : "";

    return {
      handled: true,
      reason: `${remoteStatus} → ${mapping.internal} · ${applied}${warning}`,
      orderCode: order.code,
    };
  }

  /**
   * Traduz o efeito do mapeamento em chamadas ao domínio de estoque.
   *
   * Item sem associação é registrado e SEGUE: recusar o pedido inteiro por
   * causa de um anúncio não associado deixaria a venda invisível no painel,
   * que é pior que uma venda com um item marcado como pendente.
   */
  private async applyStockEffect(
    payload: OrderSyncPayload,
    mapped: MappedOrder,
    orderCode: string,
    effect: string,
  ): Promise<string> {
    if (effect === "none") return "estoque inalterado";

    const context = {
      channel: "SHOPEE" as const,
      orderCode,
      externalOrderSn: mapped.orderSn,
      correlationId: payload.correlationId,
    };

    const notes: string[] = [];
    for (const item of mapped.items) {
      if (!item.link) {
        notes.push(`${item.itemId}/${item.modelId} sem associação`);
        continue;
      }
      const key = reservationKeyFor(
        payload.shopId,
        mapped.orderSn,
        item.link.productId,
        item.link.variantId,
      );

      switch (effect) {
        case "reserve": {
          const result = await this.inventory.reserve(
            {
              productId: item.link.productId,
              variantId: item.link.variantId,
              quantity: item.quantity,
              key,
              // Reserva de marketplace não expira sozinha: quem encerra é o
              // cancelamento da Shopee. Uma varredura devolvendo estoque de
              // um pedido ainda vivo é pior que segurá-lo.
              expiresAt: undefined,
            },
            context,
          );
          notes.push(`reserva ${result.reason}`);
          break;
        }
        case "confirm": {
          // Reservar antes de confirmar cobre o pedido que só aparece já
          // pago — push perdido, importação por varredura, primeira carga.
          await this.inventory.reserve(
            {
              productId: item.link.productId,
              variantId: item.link.variantId,
              quantity: item.quantity,
              key,
            },
            context,
          );
          const confirmed = await this.inventory.confirmSale(key, context);
          notes.push(`venda ${confirmed.reason}`);
          break;
        }
        case "release": {
          // Cancelamento pode chegar antes OU depois da baixa. Tentamos soltar
          // a reserva; se ela já virou venda, devolvemos ao estoque. Uma das
          // duas responde `false` e não faz nada — as duas juntas cobrem os
          // dois momentos sem precisar adivinhar em qual estamos.
          const released = await this.inventory.release(key, context);
          if (!released) {
            const restocked = await this.inventory.returnToStock(key, context);
            notes.push(restocked ? "venda estornada ao estoque" : "nada a liberar");
          } else {
            notes.push("reserva liberada");
          }
          break;
        }
        case "restock": {
          const restocked = await this.inventory.returnToStock(key, context);
          notes.push(restocked ? "devolvido ao estoque" : "sem baixa a estornar");
          break;
        }
      }
    }
    return notes.join(", ") || "sem itens aplicáveis";
  }

  /** Cria o pedido interno a partir do pedido da Shopee. */
  private async createOrder(shopId: string, mapped: MappedOrder): Promise<Order> {
    const doc = {
      code: await this.nextCode(),
      channel: "shopee" as const,
      externalRef: { source: "shopee" as const, shopId, orderSn: mapped.orderSn },
      items: mapped.items.map((item) => ({
        productId: item.link?.productId ?? `shopee:${item.itemId}:${item.modelId}`,
        name: item.name,
        ...(item.variantName ? { variantName: item.variantName } : {}),
        quantity: item.quantity,
        price: item.price,
      })),
      customer: mapped.customer,
      ...(mapped.shippingAddress ? { shippingAddress: mapped.shippingAddress } : {}),
      // A Shopee liquida por fora; `pix` é o método mais próximo do que o
      // enum interno oferece, e o canal já diz que o dinheiro não passou aqui.
      paymentMethod: "pix" as const,
      status: "pending" as const,
      subtotal: mapped.subtotal,
      shipping: 0,
      discount: 0,
      total: mapped.total,
    };

    try {
      const created = await this.orderModel.create(doc);
      this.logger.log(`Pedido ${created.code} importado da Shopee (${mapped.orderSn}).`);
      return created.toObject() as unknown as Order;
    } catch (error) {
      // Dois workers importando o mesmo pedido: o índice parcial único barra
      // o segundo, e o certo é usar o que o primeiro criou.
      if (!isDuplicateKey(error)) throw error;
      const existing = await this.orderModel
        .findOne({
          "externalRef.source": "shopee",
          "externalRef.shopId": shopId,
          "externalRef.orderSn": mapped.orderSn,
        })
        .lean<Order | null>();
      if (!existing) throw error;
      return existing;
    }
  }

  // ── Varredura de recuperação ───────────────────────────────────────────

  /**
   * Busca pedidos por janela de tempo e os enfileira.
   *
   * É a rede embaixo do push: o enunciado pede explicitamente para não
   * depender só de webhook. Push perdido, app suspenso, endpoint fora do ar —
   * a varredura acha o pedido de qualquer jeito.
   */
  async pollRecentOrders(
    windowMinutes = 60,
    correlationId: string = randomUUID(),
  ): Promise<{ found: number; enqueued: number }> {
    const shopId = await this.auth.shopId();
    if (!shopId) return { found: 0, enqueued: 0 };

    const credentials = await this.auth.credentials();
    const shop = await this.auth.shopAuth();
    const now = Math.floor(Date.now() / 1000);

    let cursor = "";
    let found = 0;
    let enqueued = 0;

    // A API limita a janela a 15 dias e a página a 100.
    for (let page = 0; page < 20; page += 1) {
      const response = await this.api.call<OrderListResponse>(
        credentials,
        "/order/get_order_list",
        {
          shop,
          correlationId,
          query: {
            time_range_field: "update_time",
            time_from: now - windowMinutes * 60,
            time_to: now,
            page_size: 100,
            response_optional_fields: "order_status",
            ...(cursor ? { cursor } : {}),
          },
        },
      );

      for (const row of response.order_list ?? []) {
        if (!row.order_sn) continue;
        found += 1;
        await this.enqueue({
          shopId,
          orderSn: row.order_sn,
          hintedStatus: row.order_status,
          correlationId,
        });
        enqueued += 1;
      }

      if (!response.more || !response.next_cursor) break;
      cursor = response.next_cursor;
    }

    return { found, enqueued };
  }

  async listImported(limit = 50): Promise<Order[]> {
    return this.orderModel
      .find({ channel: "shopee" })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean<Order[]>();
  }

  async listEvents(limit = 50): Promise<ShopeeEvent[]> {
    return this.eventModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean<ShopeeEvent[]>();
  }

  // ── Internos ───────────────────────────────────────────────────────────

  private async fetchOrderDetail(
    shopId: string,
    orderSn: string,
    correlationId: string,
    retriedAfterAuth = false,
  ): Promise<ShopeeOrderDetail | null> {
    const credentials = await this.auth.credentials();
    const shop = await this.auth.shopAuth();
    try {
      const response = await this.api.call<OrderDetailResponse>(
        credentials,
        "/order/get_order_detail",
        {
          shop,
          correlationId,
          query: {
            order_sn_list: orderSn,
            response_optional_fields: "item_list,recipient_address,total_amount,buyer_username",
          },
        },
      );
      return response.order_list?.[0] ?? null;
    } catch (error) {
      if (isAuthError(error) && !retriedAfterAuth) {
        await this.auth.refresh();
        return this.fetchOrderDetail(shopId, orderSn, correlationId, true);
      }
      throw error;
    }
  }

  private async loadLinks(shopId: string): Promise<Map<string, ShopeeProductLink>> {
    const rows = await this.links.list(shopId);
    return new Map(
      rows
        .filter((row) => row.status !== "disabled")
        .map((row) => [`${row.itemId}:${row.modelId}`, row]),
    );
  }

  private eventKey(shopId: string, orderSn: string, eventType: string): string {
    return `SHOPEE:${shopId}:${orderSn}:${eventType}`;
  }

  /**
   * Reivindica o evento. `true` significa "sou o primeiro"; `false`, que
   * outra execução já pegou — e é o índice único, não uma consulta prévia,
   * que decide.
   */
  private async claimEvent(
    payload: OrderSyncPayload,
    eventType: string,
  ): Promise<boolean> {
    try {
      await this.eventModel.create({
        key: this.eventKey(payload.shopId, payload.orderSn, eventType),
        shopId: payload.shopId,
        orderSn: payload.orderSn,
        eventType,
        pushCode: payload.pushCode,
        status: "received",
        correlationId: payload.correlationId,
      });
      return true;
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }

  private async recordEvent(
    payload: OrderSyncPayload,
    eventType: string,
    status: "ignored" | "failed",
    outcome: string,
  ): Promise<void> {
    await this.eventModel
      .updateOne(
        { key: this.eventKey(payload.shopId, payload.orderSn, eventType) },
        {
          $set: { status, outcome },
          $setOnInsert: {
            key: this.eventKey(payload.shopId, payload.orderSn, eventType),
            shopId: payload.shopId,
            orderSn: payload.orderSn,
            eventType,
            pushCode: payload.pushCode,
            correlationId: payload.correlationId,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  /** Sequência própria: `SHP-…` distingue na hora o que veio do marketplace. */
  private async nextCode(): Promise<string> {
    const last = await this.orderModel
      .findOne({ code: new RegExp(`^${CODE_PREFIX}\\d+$`) })
      .sort({ code: -1 })
      .lean<{ code?: string } | null>();
    const current = last?.code ? Number(last.code.slice(CODE_PREFIX.length)) : 1000;
    return `${CODE_PREFIX}${current + 1}`;
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
