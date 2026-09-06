import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/roles";
import { IntegrationsService } from "../integrations/integrations.service";
import { InventoryService } from "../inventory/inventory.service";
import { OutboxService } from "../outbox/outbox.service";
import { ShopeeAuthService } from "./shopee-auth.service";
import { ShopeeLinkService } from "./shopee-link.service";
import { ShopeeInventoryService, STOCK_SYNC_TOPIC } from "./shopee-inventory.service";
import { ShopeeOrderService, ORDER_SYNC_TOPIC } from "./shopee-order.service";
import { ShopeeReconciliationService } from "./shopee-reconciliation.service";
import { ShopeeSyncService } from "./shopee-sync.service";
import {
  AuthorizeUrlDto,
  ConnectShopeeDto,
  ReconcileDto,
  RetryMessageDto,
  ShopeeSettingsDto,
  SyncSkuDto,
  UpsertLinkDto,
} from "./dto/shopee.dto";

/**
 * A área de Shopee do painel. Tudo `superadmin`, como o resto da administração.
 *
 * Nenhuma rota devolve token, refresh token ou partner_key — nem mascarados
 * pela metade. O painel mostra ESTADO (conectado, vence em tanto tempo), que
 * é o que ele precisa para ser útil.
 */
@Roles("superadmin")
@Controller("shopee")
export class ShopeeController {
  constructor(
    private readonly auth: ShopeeAuthService,
    private readonly links: ShopeeLinkService,
    private readonly stock: ShopeeInventoryService,
    private readonly orders: ShopeeOrderService,
    private readonly reconciliation: ShopeeReconciliationService,
    private readonly sync: ShopeeSyncService,
    private readonly outbox: OutboxService,
    private readonly inventory: InventoryService,
    private readonly integrations: IntegrationsService,
  ) {}

  // ── Conexão ────────────────────────────────────────────────────────────

  @Get("connection")
  connection() {
    return this.auth.connection();
  }

  /** Monta a URL de autorização. O lojista é quem abre e autoriza. */
  @Post("authorize-url")
  async authorizeUrl(@Body() dto: AuthorizeUrlDto) {
    return { url: await this.auth.authorizationUrl(dto.redirectUri) };
  }

  /** Recebe o `code` do retorno da autorização e grava o par de tokens. */
  @Post("connect")
  connect(@Body() dto: ConnectShopeeDto) {
    return this.auth.exchangeCode(dto.code, dto.shopId);
  }

  @Post("disconnect")
  disconnect() {
    return this.auth.disconnect();
  }

  @Post("settings")
  async settings(@Body() dto: ShopeeSettingsDto) {
    const config: Record<string, unknown> = {};
    if (dto.autoSync !== undefined) config.autoSync = dto.autoSync;
    if (dto.defaultSafetyMargin !== undefined) {
      config.defaultSafetyMargin = dto.defaultSafetyMargin;
    }
    if (dto.pushSignatureScheme) {
      config.pushSignatureScheme = dto.pushSignatureScheme;
    }
    if (Object.keys(config).length > 0) {
      await this.integrations.update("shopee", { config });
    }
    return this.auth.connection();
  }

  // ── Associações ────────────────────────────────────────────────────────

  @Get("links")
  async listLinks() {
    const shopId = await this.auth.shopId();
    return shopId ? this.links.list(shopId) : [];
  }

  /** Anúncios da Shopee, para escolher o que associar. */
  @Get("listings")
  listings() {
    return this.stock.listRemoteListings();
  }

  /**
   * Propõe associações por SKU. Nada é aplicado: a resposta traz o grau de
   * confiança, e o que for ambíguo espera uma decisão humana.
   */
  @Get("suggestions")
  async suggestions() {
    const shopId = await this.auth.shopId();
    if (!shopId) return [];
    const listings = await this.stock.listRemoteListings();
    return this.links.suggest(shopId, listings);
  }

  @Post("links")
  async upsertLink(@Body() dto: UpsertLinkDto) {
    const shopId = await this.auth.shopId();
    if (!shopId) throw new BadRequestException("Nenhuma loja Shopee conectada.");
    return this.links.upsert({ ...dto, shopId });
  }

  @Delete("links/:id")
  async removeLink(@Param("id") id: string) {
    await this.links.remove(id);
    return { removed: true };
  }

  // ── Sincronização ──────────────────────────────────────────────────────

  /** Sincroniza um SKU agora, sem esperar a fila. */
  @Post("sync")
  async syncOne(@Body() dto: SyncSkuDto, @CurrentUser() user: AuthenticatedUser) {
    const shopId = await this.auth.shopId();
    if (!shopId) throw new BadRequestException("Nenhuma loja Shopee conectada.");

    const correlationId = randomUUID();
    const result = await this.stock.syncOne({
      shopId,
      productId: dto.productId,
      variantId: dto.variantId ?? "",
      correlationId,
    });
    return { ...result, correlationId, requestedBy: user.email };
  }

  /** Enfileira todos os SKUs associados. */
  @Post("sync-all")
  async syncAll(@CurrentUser() user: AuthenticatedUser) {
    const correlationId = randomUUID();
    const queued = await this.stock.enqueueFullSync(correlationId);
    return { queued, correlationId, requestedBy: user.email };
  }

  /** Conciliação completa sob demanda; `dryRun` mostra sem corrigir. */
  @Post("reconcile")
  reconcile(@Body() dto: ReconcileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reconciliation
      .run({ dryRun: dto.dryRun })
      .then((report) => ({ ...report, requestedBy: user.email }));
  }

  /** Força a varredura de pedidos, sem esperar o intervalo. */
  @Post("poll-orders")
  pollOrders() {
    return this.sync.pollOrders();
  }

  /** Roda uma volta da fila na hora — útil para não esperar o tick. */
  @Post("drain")
  drain() {
    return this.sync.tick();
  }

  // ── Diagnóstico ────────────────────────────────────────────────────────

  @Get("orders")
  listOrders(@Query("limit") limit?: string) {
    return this.orders.listImported(limit ? Number(limit) : 50);
  }

  @Get("events")
  listEvents(@Query("limit") limit?: string) {
    return this.orders.listEvents(limit ? Number(limit) : 50);
  }

  /** A fila: pendentes, em processamento e a fila de mortas. */
  @Get("queue")
  async queue(@Query("status") status?: string, @Query("topic") topic?: string) {
    const [messages, stats] = await Promise.all([
      this.outbox.list({
        status: status as never,
        topic: topic ?? undefined,
        limit: 100,
      }),
      this.outbox.stats("shopee."),
    ]);
    return { messages, stats };
  }

  /** Reprocessa uma mensagem morta, ou todas de um tópico. */
  @Post("queue/retry")
  async retry(@Body() dto: RetryMessageDto) {
    if (dto.id) return { retried: (await this.outbox.retry(dto.id)) ? 1 : 0 };
    const topic = dto.topic ?? undefined;
    if (topic && ![STOCK_SYNC_TOPIC, ORDER_SYNC_TOPIC].includes(topic)) {
      throw new BadRequestException(`Tópico desconhecido: ${topic}`);
    }
    return { retried: await this.outbox.retryAllDead(topic) };
  }

  /** Métricas do worker mais o estado da fila. */
  @Get("metrics")
  async metrics() {
    const [stats, connection] = await Promise.all([
      this.outbox.stats("shopee."),
      this.auth.connection(),
    ]);
    return {
      worker: this.sync.getMetrics(),
      queue: stats,
      reconciliationRunning: this.reconciliation.isRunning,
      lastHealthySyncAt: connection.lastHealthySyncAt,
    };
  }

  /** O saldo de um SKU do ponto de vista da integração. */
  @Get("stock/:productId")
  async stockFor(
    @Param("productId") productId: string,
    @Query("variantId") variantId?: string,
  ) {
    const sku = { productId, variantId: variantId ?? "" };
    const shopId = await this.auth.shopId();
    const link = shopId
      ? await this.links.findBySku(shopId, sku.productId, sku.variantId)
      : null;
    const margin = link?.safetyMargin ?? (await this.auth.defaultSafetyMargin());
    return {
      stock: await this.inventory.getStock(sku),
      safetyMargin: margin,
      publishable: await this.inventory.getPublishableStock(sku, margin),
      link,
    };
  }
}
