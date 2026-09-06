import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InventoryService } from "../inventory/inventory.service";
import { ShopeeAuthService } from "./shopee-auth.service";
import { ShopeeLinkService } from "./shopee-link.service";
import { ShopeeInventoryService } from "./shopee-inventory.service";

export interface Divergence {
  productId: string;
  variantId: string;
  itemId: string;
  modelId: string;
  /** O que o sistema calcula como publicável. A verdade. */
  expected: number;
  /** O que a Shopee diz ter hoje. */
  remote: number | null;
  corrected: boolean;
  error?: string;
}

export interface ReconciliationReport {
  correlationId: string;
  startedAt: string;
  finishedAt: string;
  checked: number;
  divergences: Divergence[];
  corrected: number;
  failed: number;
  /** `true` quando só listou, sem escrever nada na Shopee. */
  dryRun: boolean;
}

/**
 * A conciliação periódica: compara o saldo publicável de cada associação com
 * o que a Shopee tem, registra a diferença e corrige usando o saldo central.
 *
 * É a terceira perna do enunciado, e a que fecha os buracos das outras duas:
 * push perdido, mensagem morta na fila, alteração feita à mão no painel da
 * Shopee. Sem ela, uma divergência criada por qualquer um desses caminhos
 * ficaria lá para sempre.
 *
 * A direção da correção é sempre a mesma — o sistema manda, a Shopee obedece.
 * O enunciado é explícito nisso, e o motivo é que só um dos dois lados conhece
 * o ledger, os lotes e as reservas do site.
 */
@Injectable()
export class ShopeeReconciliationService {
  private readonly logger = new Logger(ShopeeReconciliationService.name);

  /** Uma conciliação por vez: duas em paralelo brigariam pelo limite de taxa. */
  private running = false;

  constructor(
    private readonly inventory: InventoryService,
    private readonly links: ShopeeLinkService,
    private readonly auth: ShopeeAuthService,
    private readonly stock: ShopeeInventoryService,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Roda a conciliação.
   *
   * `dryRun` existe porque o enunciado proíbe sobrescrever em silêncio: dá
   * para ver o que MUDARIA antes de deixar mudar. E mesmo fora do dry run,
   * cada correção vira uma linha no relatório e um log com correlation id —
   * nunca uma escrita anônima.
   */
  async run(options: { dryRun?: boolean; correlationId?: string } = {}): Promise<ReconciliationReport> {
    const correlationId = options.correlationId ?? randomUUID();
    const startedAt = new Date();
    const dryRun = options.dryRun ?? false;

    if (this.running) {
      throw new Error("Já existe uma conciliação em andamento.");
    }
    this.running = true;

    const divergences: Divergence[] = [];
    let checked = 0;
    let corrected = 0;
    let failed = 0;

    try {
      const shopId = await this.auth.shopId();
      if (!shopId) {
        return this.report(correlationId, startedAt, 0, [], 0, 0, dryRun);
      }

      const links = await this.links.listSyncable(shopId);
      for (const link of links) {
        checked += 1;
        const margin = link.safetyMargin || (await this.auth.defaultSafetyMargin());
        const expected = await this.inventory.getPublishableStock(
          { productId: link.productId, variantId: link.variantId },
          margin,
        );

        let remote: number | null = null;
        try {
          remote = await this.stock.fetchRemoteStock(link, correlationId);
          if (remote !== null) {
            await this.links.recordRemoteStock(String(link._id), remote);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failed += 1;
          divergences.push({
            productId: link.productId,
            variantId: link.variantId,
            itemId: link.itemId,
            modelId: link.modelId,
            expected,
            remote: null,
            corrected: false,
            error: message,
          });
          this.logger.warn(
            `[${correlationId}] não foi possível ler o item ${link.itemId}/${link.modelId}: ${message}`,
          );
          continue;
        }

        if (remote === expected) continue;

        const divergence: Divergence = {
          productId: link.productId,
          variantId: link.variantId,
          itemId: link.itemId,
          modelId: link.modelId,
          expected,
          remote,
          corrected: false,
        };

        // O registro vem ANTES da correção: uma divergência que a correção
        // apaga sem deixar rastro é indistinguível de uma que nunca existiu,
        // e é justamente o histórico dela que revela um vazamento crônico.
        this.logger.warn(
          `[${correlationId}] divergência no item ${link.itemId}/${link.modelId}: ` +
            `central ${expected}, Shopee ${remote ?? "?"}${dryRun ? " (simulação)" : ""}`,
        );

        if (!dryRun) {
          try {
            await this.stock.syncOne({
              shopId,
              productId: link.productId,
              variantId: link.variantId,
              correlationId,
            });
            divergence.corrected = true;
            corrected += 1;
          } catch (error) {
            divergence.error = error instanceof Error ? error.message : String(error);
            failed += 1;
          }
        }

        divergences.push(divergence);
      }

      if (failed === 0 && !dryRun) {
        await this.auth.markHealthySync();
      }

      return this.report(correlationId, startedAt, checked, divergences, corrected, failed, dryRun);
    } finally {
      this.running = false;
    }
  }

  private report(
    correlationId: string,
    startedAt: Date,
    checked: number,
    divergences: Divergence[],
    corrected: number,
    failed: number,
    dryRun: boolean,
  ): ReconciliationReport {
    return {
      correlationId,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      checked,
      divergences,
      corrected,
      failed,
      dryRun,
    };
  }
}
