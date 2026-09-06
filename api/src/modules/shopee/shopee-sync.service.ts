import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { hostname } from "os";
import { InventoryService } from "../inventory/inventory.service";
import { OutboxService } from "../outbox/outbox.service";
import { isRateLimited, ShopeeApiError } from "./shopee-api.client";
import { ShopeeAuthService } from "./shopee-auth.service";
import {
  ShopeeInventoryService,
  STOCK_SYNC_TOPIC,
  type StockSyncPayload,
} from "./shopee-inventory.service";
import {
  ShopeeOrderService,
  ORDER_SYNC_TOPIC,
  type OrderSyncPayload,
} from "./shopee-order.service";
import { ShopeeReconciliationService } from "./shopee-reconciliation.service";

/** Métricas do ciclo, para o painel e para o log. */
export interface SyncMetrics {
  processed: number;
  succeeded: number;
  failed: number;
  dead: number;
  rateLimited: number;
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  lastHealthyRunAt: string | null;
  ordersImported: number;
  duplicatesIgnored: number;
}

const TOPICS = [STOCK_SYNC_TOPIC, ORDER_SYNC_TOPIC];

/** De quanto em quanto tempo o worker olha a fila. */
const TICK_MS = 5_000;
/** Quantas mensagens no máximo por volta, para não segurar o processo. */
const BATCH = 10;
/** Varredura de recuperação de pedidos. */
const POLL_MS = 10 * 60_000;
/** Conciliação completa. */
const RECONCILE_MS = 6 * 3600_000;
/** Varredura de reservas e lotes vencidos. */
const HOUSEKEEPING_MS = 15 * 60_000;

/**
 * O worker que tira as mensagens da fila e as executa, mais os disparos
 * periódicos.
 *
 * O gatilho é um timer em memória; o ESTADO nunca é. Toda mensagem vive no
 * Mongo com lock por tempo, então derrubar o processo no meio de uma
 * sincronização não perde nada: outro worker (ou o mesmo, depois do restart)
 * pega a mensagem quando o lock expira. É o que o enunciado quer dizer com
 * "não use um processo puramente em memória para operações críticas".
 *
 * Não há `@nestjs/schedule` aqui de propósito — uma dependência nova para
 * `setInterval` não se paga, e o CI audita as dependências de produção.
 */
@Injectable()
export class ShopeeSyncService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ShopeeSyncService.name);
  private readonly workerId = `${hostname()}:${process.pid}`;
  private readonly timers: NodeJS.Timeout[] = [];
  private ticking = false;
  private stopped = false;

  private metrics: SyncMetrics = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    rateLimited: 0,
    lastRunAt: null,
    lastRunDurationMs: null,
    lastHealthyRunAt: null,
    ordersImported: 0,
    duplicatesIgnored: 0,
  };

  constructor(
    private readonly outbox: OutboxService,
    private readonly stock: ShopeeInventoryService,
    private readonly orders: ShopeeOrderService,
    private readonly reconciliation: ShopeeReconciliationService,
    private readonly auth: ShopeeAuthService,
    private readonly inventory: InventoryService,
  ) {}

  onApplicationBootstrap(): void {
    // Os testes de integração instanciam o módulo sem querer um worker
    // rodando por baixo: um timer disparando no meio de um caso tornaria a
    // suíte não-determinística.
    if (process.env.NODE_ENV === "test" || process.env.SHOPEE_WORKER === "off") {
      this.logger.log("Worker da Shopee desligado por configuração.");
      return;
    }

    this.timers.push(setInterval(() => void this.tick(), TICK_MS));
    this.timers.push(setInterval(() => void this.pollOrders(), POLL_MS));
    this.timers.push(setInterval(() => void this.reconcile(), RECONCILE_MS));
    this.timers.push(setInterval(() => void this.housekeeping(), HOUSEKEEPING_MS));
    for (const timer of this.timers) timer.unref();
    this.logger.log(`Worker da Shopee no ar (${this.workerId}).`);
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Uma volta da fila.
   *
   * `ticking` impede que um ciclo lento se sobreponha ao seguinte — sem isso,
   * uma Shopee lenta acumularia voltas até o processo engasgar.
   */
  async tick(): Promise<SyncMetrics> {
    if (this.ticking || this.stopped) return this.getMetrics();
    this.ticking = true;
    const startedAt = Date.now();

    try {
      if (!(await this.auth.isEnabled())) return this.getMetrics();

      let failures = 0;
      for (let i = 0; i < BATCH; i += 1) {
        const message = await this.outbox.claim(TOPICS, this.workerId);
        if (!message) break;

        this.metrics.processed += 1;
        try {
          await this.execute(message.topic, message.payload);
          await this.outbox.markDone(String(message._id));
          this.metrics.succeeded += 1;
        } catch (error) {
          failures += 1;
          this.metrics.failed += 1;
          if (isRateLimited(error)) this.metrics.rateLimited += 1;

          const message_ = error instanceof Error ? error.message : String(error);
          const status = await this.outbox.markFailed(message, message_);
          if (status === "dead") this.metrics.dead += 1;

          this.logger.warn(
            `[${message.correlationId ?? "-"}] ${message.topic} falhou ` +
              `(tentativa ${message.attempts}/${message.maxAttempts}): ${message_}`,
          );

          // Limite de taxa vale para a loja inteira, não para uma mensagem:
          // insistir nas próximas só faria o bloqueio durar mais.
          if (isRateLimited(error)) break;
        }
      }

      this.metrics.lastRunAt = new Date().toISOString();
      this.metrics.lastRunDurationMs = Date.now() - startedAt;
      if (failures === 0 && this.metrics.processed > 0) {
        this.metrics.lastHealthyRunAt = this.metrics.lastRunAt;
      }
      return this.getMetrics();
    } finally {
      this.ticking = false;
    }
  }

  private async execute(topic: string, payload: Record<string, unknown>): Promise<void> {
    switch (topic) {
      case STOCK_SYNC_TOPIC: {
        const result = await this.stock.syncOne(payload as unknown as StockSyncPayload);
        // `ok: false` aqui é "não havia o que fazer" (associação desligada ou
        // pendente), não erro. Marcar como falha gastaria tentativas e
        // acabaria enchendo a fila de mortas com o que é normal.
        if (!result.ok) {
          this.logger.debug(`sync ignorado: ${result.reason}`);
        }
        return;
      }
      case ORDER_SYNC_TOPIC: {
        const result = await this.orders.process(payload as unknown as OrderSyncPayload);
        if (result.handled) this.metrics.ordersImported += 1;
        else if (result.reason.includes("já processado")) {
          this.metrics.duplicatesIgnored += 1;
        }
        return;
      }
      default:
        throw new Error(`Tópico sem handler: ${topic}`);
    }
  }

  /** Varredura de pedidos: a rede embaixo do push. */
  async pollOrders(): Promise<{ found: number; enqueued: number }> {
    if (this.stopped) return { found: 0, enqueued: 0 };
    try {
      if (!(await this.auth.isEnabled())) return { found: 0, enqueued: 0 };
      if (!(await this.auth.isAutoSyncEnabled())) return { found: 0, enqueued: 0 };
      return await this.orders.pollRecentOrders();
    } catch (error) {
      this.logger.warn(`Varredura de pedidos falhou: ${describe(error)}`);
      return { found: 0, enqueued: 0 };
    }
  }

  private async reconcile(): Promise<void> {
    try {
      if (!(await this.auth.isEnabled())) return;
      if (!(await this.auth.isAutoSyncEnabled())) return;
      const report = await this.reconciliation.run();
      if (report.divergences.length > 0) {
        this.logger.warn(
          `Conciliação: ${report.divergences.length} divergência(s) em ${report.checked} anúncios, ` +
            `${report.corrected} corrigida(s).`,
        );
      }
    } catch (error) {
      this.logger.warn(`Conciliação falhou: ${describe(error)}`);
    }
  }

  /**
   * Higiene do estoque, independente da Shopee: devolve reserva abandonada e
   * limpa mensagem antiga já entregue.
   */
  private async housekeeping(): Promise<void> {
    try {
      const released = await this.inventory.releaseExpiredReservations();
      if (released > 0) {
        this.logger.log(`${released} reserva(s) expirada(s) devolvida(s) ao estoque.`);
      }
      await this.outbox.purgeDone();
    } catch (error) {
      this.logger.warn(`Manutenção do estoque falhou: ${describe(error)}`);
    }
  }
}

function describe(error: unknown): string {
  if (error instanceof ShopeeApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
