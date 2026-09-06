import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InventoryService, type Sku } from "../inventory/inventory.service";
import { OutboxService } from "../outbox/outbox.service";
import { ShopeeApiClient, isAuthError } from "./shopee-api.client";
import { ShopeeAuthService } from "./shopee-auth.service";
import { ShopeeLinkService } from "./shopee-link.service";
import type { ShopeeProductLink } from "./schemas/shopee-product-link.schema";

export const STOCK_SYNC_TOPIC = "shopee.stock.sync";

export interface StockSyncPayload extends Record<string, unknown> {
  shopId: string;
  productId: string;
  variantId: string;
  correlationId: string;
}

export interface SyncOutcome {
  ok: boolean;
  /** `skipped` cobre tudo que não é erro e também não é envio. */
  reason: string;
  pushedStock?: number;
}

interface UpdateStockResponse {
  failure_list?: { model_id?: number; failed_reason?: string }[];
  success_list?: { model_id?: number; stock?: number }[];
}

interface ModelListResponse {
  model?: { model_id?: number; model_sku?: string; stock_info_v2?: RemoteStockInfo }[];
  tier_variation?: unknown;
}

interface RemoteStockInfo {
  summary_info?: { total_available_stock?: number };
  seller_stock?: { location_id?: string; stock?: number }[];
}

interface ItemBaseInfoResponse {
  item_list?: {
    item_id?: number;
    item_name?: string;
    item_sku?: string;
    has_model?: boolean;
    stock_info_v2?: RemoteStockInfo;
  }[];
}

/**
 * O caminho estoque interno → Shopee.
 *
 * A regra de QUANTO anunciar não mora aqui: mora em `publishableStock`, no
 * domínio de estoque. Este serviço só descobre o número, converte para o
 * formato do `update_stock` e trata a resposta. É a separação que o enunciado
 * pede — nada de específico da Shopee vaza para o estoque, e nada de regra de
 * estoque vaza para cá.
 */
@Injectable()
export class ShopeeInventoryService {
  private readonly logger = new Logger(ShopeeInventoryService.name);

  constructor(
    private readonly inventory: InventoryService,
    private readonly links: ShopeeLinkService,
    private readonly auth: ShopeeAuthService,
    private readonly api: ShopeeApiClient,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Enfileira a sincronização de um SKU. É o que TODO caminho que mexe em
   * estoque chama — venda no site, pedido da Shopee, ajuste no painel.
   *
   * Enfileirar em vez de chamar: a venda não pode depender da latência (nem
   * da disponibilidade) do marketplace, e a mensagem sobrevive a um restart
   * no meio. Repetir para o mesmo SKU não empilha mensagens — a `dedupeKey`
   * cuida disso, e mandar o saldo atual duas vezes não teria efeito nenhum.
   */
  async enqueueSync(sku: Sku, correlationId: string = randomUUID()): Promise<void> {
    if (!(await this.auth.isEnabled())) return;
    const shopId = await this.auth.shopId();
    if (!shopId) return;

    const link = await this.links.findBySku(shopId, sku.productId, sku.variantId);
    if (!link || link.status === "disabled" || !link.autoSync) return;

    await this.outbox.enqueue({
      topic: STOCK_SYNC_TOPIC,
      dedupeKey: `${STOCK_SYNC_TOPIC}:${shopId}:${sku.productId}:${sku.variantId}`,
      payload: {
        shopId,
        productId: sku.productId,
        variantId: sku.variantId,
        correlationId,
      } satisfies StockSyncPayload,
      correlationId,
    });
  }

  /** Enfileira todos os SKUs associados — a sincronização em massa do painel. */
  async enqueueFullSync(correlationId: string = randomUUID()): Promise<number> {
    const shopId = await this.auth.shopId();
    if (!shopId) return 0;

    const links = await this.links.listSyncable(shopId);
    for (const link of links) {
      await this.outbox.enqueue({
        topic: STOCK_SYNC_TOPIC,
        dedupeKey: `${STOCK_SYNC_TOPIC}:${shopId}:${link.productId}:${link.variantId}`,
        payload: {
          shopId,
          productId: link.productId,
          variantId: link.variantId,
          correlationId,
        } satisfies StockSyncPayload,
        correlationId,
      });
    }
    return links.length;
  }

  /**
   * Executa uma sincronização. Chamado pelo worker da fila e pelo botão
   * "sincronizar agora" do painel.
   *
   * Lança em erro retentável, para o worker aplicar o backoff. Devolve
   * `ok: false` sem lançar quando não há o que fazer — uma associação
   * desligada não é falha e não deve gastar tentativa.
   */
  async syncOne(payload: StockSyncPayload): Promise<SyncOutcome> {
    const link = await this.links.findBySku(
      payload.shopId,
      payload.productId,
      payload.variantId,
    );
    if (!link) return { ok: false, reason: "sem associação" };
    if (link.status === "disabled") return { ok: false, reason: "associação desligada" };
    if (link.status === "pending") {
      return { ok: false, reason: "associação aguardando confirmação" };
    }

    const margin = link.safetyMargin || (await this.auth.defaultSafetyMargin());
    const target = await this.inventory.getPublishableStock(
      { productId: payload.productId, variantId: payload.variantId },
      margin,
    );

    // Já mandamos este número e a última tentativa deu certo: não gastamos
    // uma chamada do limite de taxa para repetir o que a Shopee já sabe.
    if (link.lastPushedStock === target && link.status === "active") {
      return { ok: true, reason: "saldo já sincronizado", pushedStock: target };
    }

    try {
      await this.pushStock(link, target, payload.correlationId);
      await this.links.recordSyncSuccess(String(link._id), target);
      this.logger.log(
        `[${payload.correlationId}] estoque ${target} enviado para item ${link.itemId}/${link.modelId}.`,
      );
      return { ok: true, reason: "enviado", pushedStock: target };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.links.recordSyncFailure(String(link._id), message);
      throw error;
    }
  }

  /**
   * A chamada em si. `update_stock` aceita um `item_id` por vez com vários
   * `model_id` — aqui vai um de cada vez, porque a unidade de decisão do
   * sistema é o SKU e agrupar por item traria um lote onde metade pode falhar.
   *
   * Renova o token e repete UMA vez quando a Shopee recusa por autenticação:
   * o token pode ter vencido entre a checagem e a chamada.
   */
  private async pushStock(
    link: ShopeeProductLink,
    stock: number,
    correlationId: string,
    retriedAfterAuth = false,
  ): Promise<void> {
    const credentials = await this.auth.credentials();
    const shop = await this.auth.shopAuth();

    try {
      const result = await this.api.call<UpdateStockResponse>(
        credentials,
        "/product/update_stock",
        {
          method: "POST",
          shop,
          correlationId,
          body: {
            item_id: Number(link.itemId),
            stock_list: [
              {
                model_id: Number(link.modelId || 0),
                seller_stock: [{ stock }],
              },
            ],
          },
        },
      );

      // A v2 devolve 200 com `failure_list` preenchida: sucesso parcial é
      // falha para nós, senão marcaríamos como sincronizado o que não foi.
      const failure = result.failure_list?.[0];
      if (failure) {
        throw new Error(
          `Shopee recusou o model ${failure.model_id ?? link.modelId}: ${failure.failed_reason ?? "motivo não informado"}`,
        );
      }
    } catch (error) {
      if (isAuthError(error) && !retriedAfterAuth) {
        await this.auth.refresh();
        await this.pushStock(link, stock, correlationId, true);
        return;
      }
      throw error;
    }
  }

  /** Lê o saldo que a Shopee tem hoje — a base da conciliação. */
  async fetchRemoteStock(link: ShopeeProductLink, correlationId: string): Promise<number | null> {
    const credentials = await this.auth.credentials();
    const shop = await this.auth.shopAuth();

    if (link.modelId && link.modelId !== "0") {
      const response = await this.api.call<ModelListResponse>(
        credentials,
        "/product/get_model_list",
        { shop, correlationId, query: { item_id: link.itemId } },
      );
      const model = response.model?.find(
        (row) => String(row.model_id) === link.modelId,
      );
      return readStock(model?.stock_info_v2);
    }

    const response = await this.api.call<ItemBaseInfoResponse>(
      credentials,
      "/product/get_item_base_info",
      { shop, correlationId, query: { item_id_list: link.itemId } },
    );
    return readStock(response.item_list?.[0]?.stock_info_v2);
  }

  /** Todos os anúncios da loja, para a tela de associação. */
  async listRemoteListings(correlationId: string = randomUUID()) {
    const credentials = await this.auth.credentials();
    const shop = await this.auth.shopAuth();

    const page = await this.api.call<{
      item?: { item_id?: number; item_status?: string }[];
    }>(credentials, "/product/get_item_list", {
      shop,
      correlationId,
      query: { offset: 0, page_size: 100, item_status: "NORMAL" },
    });

    const itemIds = (page.item ?? [])
      .map((row) => row.item_id)
      .filter((id): id is number => typeof id === "number");
    if (itemIds.length === 0) return [];

    const listings: {
      itemId: string;
      modelId: string;
      name: string;
      sku: string;
      stock?: number;
    }[] = [];

    // `get_item_base_info` aceita até 50 ids por chamada.
    for (let i = 0; i < itemIds.length; i += 50) {
      const chunk = itemIds.slice(i, i + 50);
      const info = await this.api.call<ItemBaseInfoResponse>(
        credentials,
        "/product/get_item_base_info",
        { shop, correlationId, query: { item_id_list: chunk.join(",") } },
      );

      for (const item of info.item_list ?? []) {
        if (!item.item_id) continue;
        if (!item.has_model) {
          listings.push({
            itemId: String(item.item_id),
            modelId: "0",
            name: item.item_name ?? "",
            sku: item.item_sku ?? "",
            stock: readStock(item.stock_info_v2) ?? undefined,
          });
          continue;
        }

        const models = await this.api.call<ModelListResponse>(
          credentials,
          "/product/get_model_list",
          { shop, correlationId, query: { item_id: item.item_id } },
        );
        for (const model of models.model ?? []) {
          if (model.model_id === undefined) continue;
          listings.push({
            itemId: String(item.item_id),
            modelId: String(model.model_id),
            name: item.item_name ?? "",
            sku: model.model_sku || item.item_sku || "",
            stock: readStock(model.stock_info_v2) ?? undefined,
          });
        }
      }
    }
    return listings;
  }
}

/**
 * O saldo que a Shopee reporta. Prefere o resumo; caindo para a soma do
 * estoque do vendedor quando ele não vem — as duas formas aparecem conforme o
 * anúncio use ou não múltiplos armazéns.
 */
function readStock(info?: RemoteStockInfo): number | null {
  const summary = info?.summary_info?.total_available_stock;
  if (typeof summary === "number") return summary;

  const seller = info?.seller_stock;
  if (!seller?.length) return null;
  return seller.reduce((total, row) => total + (row.stock ?? 0), 0);
}
