import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Product,
  ProductDocument,
} from "../products/schemas/product.schema";
import {
  StockBatch,
  StockBatchDocument,
} from "./schemas/stock-batch.schema";
import {
  StockLedgerEntry,
  StockLedgerEntryDocument,
  type LedgerType,
  type StockChannel,
} from "./schemas/stock-ledger.schema";
import {
  StockLevel,
  StockLevelDocument,
} from "./schemas/stock-level.schema";
import {
  StockReservation,
  StockReservationDocument,
} from "./schemas/stock-reservation.schema";
import {
  expiredRemaining,
  planFefoConsumption,
  remainingOf,
  sortForFefo,
  type FefoBatch,
} from "./fefo";
import { availableStock, publishableStock } from "./publishable-stock";

/** Identidade de um SKU dentro do domínio: produto + variação. */
export interface Sku {
  productId: string;
  /** String vazia para produto simples. */
  variantId: string;
}

/** O contexto de auditoria que acompanha toda escrita. */
export interface StockContext {
  channel: StockChannel;
  orderCode?: string;
  externalOrderSn?: string;
  actor?: string;
  reason?: string;
  correlationId?: string;
}

export interface StockView extends Sku {
  onHand: number;
  reserved: number;
  expired: number;
  available: number;
  version: number;
}

export interface ReserveRequest extends Sku {
  quantity: number;
  /** Idempotência: a mesma chave nunca reserva duas vezes. */
  key: string;
  expiresAt?: Date;
}

export interface ReserveResult {
  ok: boolean;
  /** `already` quando a chave já existia — repetição, não falha. */
  reason: "reserved" | "already" | "insufficient" | "untracked";
  available: number;
}

export interface ConfirmResult {
  ok: boolean;
  reason: "confirmed" | "already" | "missing" | "insufficient" | "untracked";
  /** COGS congelado da baixa, em CENTAVOS. */
  cogs: number;
  batches: { batchId: string; quantity: number; unitCost: number }[];
}

/** Reserva do site vale este tempo antes de a varredura devolvê-la. */
const DEFAULT_HOLD_MINUTES = 60;

function skuKey(sku: Sku): string {
  return `${sku.productId}::${sku.variantId}`;
}

/**
 * O domínio de estoque. É o ÚNICO lugar que escreve saldo, lote e ledger —
 * nenhum outro serviço (incluindo a Shopee) altera quantidade por fora.
 *
 * Duas invariantes sustentam o resto:
 *
 * 1. Toda mudança de saldo passa por um `findOneAndUpdate` CONDICIONAL. A
 *    condição é a própria regra ("tem o bastante disponível"), então duas
 *    requisições disputando a última peça não precisam de transação: o Mongo
 *    aplica uma e a outra volta sem documento. O compose sobe o mongod
 *    standalone, sem replica set — transação multi-documento não existe aqui,
 *    e o desenho não depende de uma.
 *
 * 2. O ledger recebe a linha DEPOIS de o saldo ter mudado, com o saldo
 *    resultante dentro dela. Se o processo morrer entre as duas, sobra uma
 *    mudança sem linha — que a conciliação enxerga, porque a soma do ledger
 *    deixa de bater com o contador. O contrário (linha sem mudança) seria
 *    invisível, e por isso a ordem é esta.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(StockLevel.name)
    private readonly levelModel: Model<StockLevelDocument>,
    @InjectModel(StockBatch.name)
    private readonly batchModel: Model<StockBatchDocument>,
    @InjectModel(StockLedgerEntry.name)
    private readonly ledgerModel: Model<StockLedgerEntryDocument>,
    @InjectModel(StockReservation.name)
    private readonly reservationModel: Model<StockReservationDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // ── Leitura ────────────────────────────────────────────────────────────

  /**
   * O saldo de um SKU. Adota o estoque do cadastro na primeira leitura, e não
   * só na primeira reserva: a conciliação e a projeção para a Shopee leem
   * SKUs que ninguém tentou vender ainda, e um produto com 4 peças no cadastro
   * não pode ser lido como zero só porque nunca passou por um checkout — isso
   * mandaria "esgotado" para o marketplace de uma peça que existe.
   */
  async getStock(sku: Sku): Promise<StockView> {
    await this.ensureTracked(sku);
    const [level, batches] = await Promise.all([
      this.levelModel.findOne(sku).lean<StockLevel | null>(),
      this.loadBatches(sku),
    ]);
    const onHand = level?.onHand ?? 0;
    const reserved = level?.reserved ?? 0;
    const expired = expiredRemaining(batches);
    return {
      ...sku,
      onHand,
      reserved,
      expired,
      available: availableStock({ onHand, reserved, expired }),
      version: level?.version ?? 0,
    };
  }

  /**
   * O número que vai para um canal externo. Vive aqui, e não no módulo da
   * Shopee, porque a regra é do domínio de estoque — a Shopee só a consome.
   */
  async getPublishableStock(sku: Sku, safetyMargin: number): Promise<number> {
    const view = await this.getStock(sku);
    return publishableStock(
      { onHand: view.onHand, reserved: view.reserved, expired: view.expired },
      safetyMargin,
    );
  }

  async listLedger(sku: Partial<Sku>, limit = 100): Promise<StockLedgerEntry[]> {
    const filter: Record<string, unknown> = {};
    if (sku.productId) filter.productId = sku.productId;
    if (sku.variantId !== undefined) filter.variantId = sku.variantId;
    return this.ledgerModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 500))
      .lean<StockLedgerEntry[]>();
  }

  async listBatches(sku: Sku): Promise<StockBatch[]> {
    return this.batchModel.find(sku).sort({ expiresAt: 1, createdAt: 1 }).lean<StockBatch[]>();
  }

  // ── Entrada ────────────────────────────────────────────────────────────

  /**
   * Entrada de peças: cria o lote e sobe o saldo. É o único caminho que faz
   * o físico crescer — junto com `returnToStock`, que devolve a um lote que
   * já existe.
   */
  async receive(
    sku: Sku,
    input: {
      quantity: number;
      unitCost?: number;
      code?: string;
      expiresAt?: Date;
    },
    context: StockContext,
  ): Promise<StockBatch> {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new BadRequestException("A entrada precisa de quantidade inteira positiva.");
    }

    const batch = await this.batchModel.create({
      ...sku,
      code: input.code?.trim() || this.defaultBatchCode(),
      quantity: input.quantity,
      unitCost: Math.max(0, Math.trunc(input.unitCost ?? 0)),
      expiresAt: input.expiresAt,
    });

    const level = await this.bumpLevel(sku, { onHand: input.quantity });
    await this.writeLedger(sku, "entry", input.quantity, level, context, {
      batches: [
        {
          batchId: String(batch._id),
          quantity: input.quantity,
          unitCost: batch.unitCost,
        },
      ],
    });
    await this.projectToProduct(sku);
    return batch.toObject() as unknown as StockBatch;
  }

  // ── Reserva ────────────────────────────────────────────────────────────

  /**
   * Compromete estoque sem baixá-lo. É o que o checkout do site e o pedido
   * recém-descoberto da Shopee fazem.
   *
   * Idempotente pela `key`: a segunda chamada com a mesma chave devolve
   * `already` sem comprometer nada. É o que impede um push repetido da Shopee
   * de reservar a mesma peça duas vezes.
   */
  async reserve(request: ReserveRequest, context: StockContext): Promise<ReserveResult> {
    const sku: Sku = { productId: request.productId, variantId: request.variantId };

    if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
      throw new BadRequestException("A reserva precisa de quantidade inteira positiva.");
    }

    const existing = await this.reservationModel.findOne({ key: request.key }).lean();
    if (existing) {
      const view = await this.getStock(sku);
      return { ok: true, reason: "already", available: view.available };
    }

    // Peça sob demanda não tem saldo para comprometer — e não pode ser
    // barrada por isso, senão o checkout de encomenda para de funcionar.
    if (!(await this.isTracked(sku))) {
      await this.reservationModel.create({
        ...sku,
        key: request.key,
        quantity: request.quantity,
        status: "held",
        channel: context.channel,
        orderCode: context.orderCode,
        externalOrderSn: context.externalOrderSn,
        correlationId: context.correlationId,
        expiresAt: request.expiresAt ?? this.defaultHoldUntil(),
      });
      return { ok: true, reason: "untracked", available: 0 };
    }

    // Vencido não pode contar como disponível na hora da guarda. Baixar o
    // vencido ANTES torna a condição do update exata: `onHand - reserved`
    // passa a ser, de fato, o que dá para vender.
    await this.expireBatches(sku, context.correlationId);

    const level = await this.levelModel
      .findOneAndUpdate(
        {
          ...sku,
          $expr: {
            $gte: [{ $subtract: ["$onHand", "$reserved"] }, request.quantity],
          },
        },
        { $inc: { reserved: request.quantity, version: 1 } },
        { new: true },
      )
      .lean<StockLevel | null>();

    if (!level) {
      const view = await this.getStock(sku);
      return { ok: false, reason: "insufficient", available: view.available };
    }

    try {
      await this.reservationModel.create({
        ...sku,
        key: request.key,
        quantity: request.quantity,
        status: "held",
        channel: context.channel,
        orderCode: context.orderCode,
        externalOrderSn: context.externalOrderSn,
        correlationId: context.correlationId,
        expiresAt: request.expiresAt ?? this.defaultHoldUntil(),
      });
    } catch (error) {
      // Corrida na chave única: outra requisição gravou a mesma reserva entre
      // a checagem lá em cima e aqui. O `$inc` já saiu, então precisa voltar,
      // senão o estoque fica comprometido por uma reserva que não é nossa.
      await this.levelModel
        .updateOne(sku, { $inc: { reserved: -request.quantity, version: 1 } })
        .exec();
      if (isDuplicateKey(error)) {
        const view = await this.getStock(sku);
        return { ok: true, reason: "already", available: view.available };
      }
      throw error;
    }

    await this.writeLedger(sku, "reserve", -request.quantity, level, context, {
      reservationKey: request.key,
    });
    await this.projectToProduct(sku);

    const expired = expiredRemaining(await this.loadBatches(sku));
    return {
      ok: true,
      reason: "reserved",
      available: availableStock({ onHand: level.onHand, reserved: level.reserved, expired }),
    };
  }

  /**
   * Desfaz uma reserva sem venda: carrinho abandonado, pedido cancelado antes
   * de pagar, pedido da Shopee cancelado enquanto ainda estava reservado.
   *
   * Idempotente pelo status: só a transição `held → released` devolve saldo.
   */
  async release(key: string, context: StockContext): Promise<boolean> {
    const reservation = await this.reservationModel
      .findOneAndUpdate(
        { key, status: "held" },
        { $set: { status: "released" } },
        { new: true },
      )
      .lean<StockReservation | null>();

    if (!reservation) return false;

    const sku: Sku = {
      productId: reservation.productId,
      variantId: reservation.variantId,
    };
    if (!(await this.isTracked(sku))) return true;

    const level = await this.levelModel
      .findOneAndUpdate(
        sku,
        { $inc: { reserved: -reservation.quantity, version: 1 } },
        { new: true },
      )
      .lean<StockLevel | null>();
    if (!level) return true;

    await this.writeLedger(sku, "release", reservation.quantity, level, {
      ...context,
      orderCode: context.orderCode ?? reservation.orderCode,
      externalOrderSn: context.externalOrderSn ?? reservation.externalOrderSn,
    }, { reservationKey: key });
    await this.projectToProduct(sku);
    return true;
  }

  // ── Venda ──────────────────────────────────────────────────────────────

  /**
   * Confirma a venda de uma reserva: o físico sai de vez, escolhido por FEFO,
   * e o custo dos lotes consumidos congela no COGS da linha do ledger.
   *
   * Idempotente pelo status da reserva: `held → consumed` acontece uma vez, e
   * a segunda chamada devolve `already` sem baixar nada. É esta transição —
   * e não uma checagem de "já processei este evento" — que impede a baixa
   * dupla quando o pedido muda de status várias vezes na Shopee.
   */
  async confirmSale(key: string, context: StockContext): Promise<ConfirmResult> {
    const reservation = await this.reservationModel
      .findOneAndUpdate(
        { key, status: "held" },
        { $set: { status: "consumed" } },
        { new: true },
      )
      .lean<StockReservation | null>();

    if (!reservation) {
      const known = await this.reservationModel.findOne({ key }).lean<StockReservation | null>();
      return {
        ok: known?.status === "consumed",
        reason: known ? "already" : "missing",
        cogs: 0,
        batches: [],
      };
    }

    const sku: Sku = {
      productId: reservation.productId,
      variantId: reservation.variantId,
    };
    if (!(await this.isTracked(sku))) {
      return { ok: true, reason: "untracked", cogs: 0, batches: [] };
    }

    const consumed = await this.consumeFefo(sku, reservation.quantity);
    if (consumed.shortfall > 0) {
      // Não deveria acontecer: a reserva já garantia o físico. Se acontecer,
      // o lote foi mexido por fora — devolvemos a reserva ao estado anterior
      // em vez de fingir uma baixa que os lotes não sustentam.
      await this.reservationModel.updateOne({ key }, { $set: { status: "held" } }).exec();
      for (const slice of consumed.slices) {
        await this.batchModel
          .updateOne({ _id: slice.batchId }, { $inc: { consumed: -slice.quantity } })
          .exec();
      }
      this.logger.error(
        `Lotes insuficientes para a reserva ${key}: faltaram ${consumed.shortfall}.`,
      );
      return { ok: false, reason: "insufficient", cogs: 0, batches: [] };
    }

    const level = await this.levelModel
      .findOneAndUpdate(
        sku,
        {
          $inc: {
            onHand: -reservation.quantity,
            reserved: -reservation.quantity,
            version: 1,
          },
        },
        { new: true },
      )
      .lean<StockLevel | null>();

    await this.writeLedger(
      sku,
      "sale",
      -reservation.quantity,
      level ?? { onHand: 0, reserved: 0 },
      {
        ...context,
        orderCode: context.orderCode ?? reservation.orderCode,
        externalOrderSn: context.externalOrderSn ?? reservation.externalOrderSn,
      },
      { batches: consumed.slices, cogs: consumed.cogs, reservationKey: key },
    );
    await this.projectToProduct(sku);

    return {
      ok: true,
      reason: "confirmed",
      cogs: consumed.cogs,
      batches: consumed.slices,
    };
  }

  /**
   * Devolve ao estoque uma venda já confirmada: devolução do comprador,
   * reembolso, pedido cancelado depois de despachado.
   *
   * Cria um lote novo em vez de reabrir o consumido: a peça que volta pode
   * ter outra validade e outro estado, e reabrir o lote antigo apagaria o
   * fato de que ela chegou a sair.
   */
  async returnToStock(key: string, context: StockContext): Promise<boolean> {
    const reservation = await this.reservationModel
      .findOneAndUpdate(
        { key, status: "consumed" },
        { $set: { status: "released" } },
        { new: true },
      )
      .lean<StockReservation | null>();

    if (!reservation) return false;

    const sku: Sku = {
      productId: reservation.productId,
      variantId: reservation.variantId,
    };
    if (!(await this.isTracked(sku))) return true;

    const source = await this.batchModel
      .findOne(sku)
      .sort({ createdAt: -1 })
      .lean<StockBatch | null>();

    const batch = await this.batchModel.create({
      ...sku,
      code: `DEV-${reservation.orderCode ?? reservation.externalOrderSn ?? "manual"}`,
      quantity: reservation.quantity,
      unitCost: source?.unitCost ?? 0,
    });

    const level = await this.bumpLevel(sku, { onHand: reservation.quantity });
    await this.writeLedger(sku, "return", reservation.quantity, level, {
      ...context,
      orderCode: context.orderCode ?? reservation.orderCode,
      externalOrderSn: context.externalOrderSn ?? reservation.externalOrderSn,
    }, {
      reservationKey: key,
      batches: [
        {
          batchId: String(batch._id),
          quantity: reservation.quantity,
          unitCost: batch.unitCost,
        },
      ],
    });
    await this.projectToProduct(sku);
    return true;
  }

  // ── Ajuste, perda e vencimento ─────────────────────────────────────────

  /**
   * Correção manual do saldo pelo painel. Exige motivo: um ajuste sem motivo
   * é indistinguível de um erro, e o ledger existe para dar conta disso.
   */
  async adjust(
    sku: Sku,
    delta: number,
    context: StockContext & { reason: string },
  ): Promise<StockView> {
    if (!Number.isInteger(delta) || delta === 0) {
      throw new BadRequestException("O ajuste precisa de um inteiro diferente de zero.");
    }
    if (!context.reason?.trim()) {
      throw new BadRequestException("Todo ajuste de estoque precisa de motivo.");
    }

    if (delta > 0) {
      await this.receive(sku, { quantity: delta }, { ...context, channel: context.channel });
      const grown = await this.getStock(sku);
      return grown;
    }

    const wanted = -delta;
    const consumed = await this.consumeFefo(sku, wanted, "lost");
    if (consumed.shortfall > 0) {
      await this.undoBatchConsumption(consumed.slices, "lost");
      throw new BadRequestException(
        `Não há ${wanted} unidades em lote para ajustar (faltam ${consumed.shortfall}).`,
      );
    }

    const level = await this.takeFromOnHand(sku, wanted);
    if (!level) {
      await this.undoBatchConsumption(consumed.slices, "consumed");
      throw new BadRequestException(
        "O ajuste deixaria menos peças do que já está reservado. " +
          "Cancele ou libere as reservas antes.",
      );
    }
    await this.writeLedger(sku, "adjustment", delta, level, context, {
      batches: consumed.slices,
    });
    await this.projectToProduct(sku);
    return this.getStock(sku);
  }

  /** Peça quebrada, extraviada ou refugo. Sai do físico e não volta. */
  async registerLoss(
    sku: Sku,
    quantity: number,
    context: StockContext & { reason: string },
  ): Promise<StockView> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException("A perda precisa de quantidade inteira positiva.");
    }
    if (!context.reason?.trim()) {
      throw new BadRequestException("Toda perda precisa de motivo.");
    }

    const consumed = await this.consumeFefo(sku, quantity, "lost");
    if (consumed.shortfall > 0) {
      await this.undoBatchConsumption(consumed.slices, "lost");
      throw new BadRequestException(
        `Não há ${quantity} unidades em lote para dar baixa (faltam ${consumed.shortfall}).`,
      );
    }

    const level = await this.takeFromOnHand(sku, quantity);
    if (!level) {
      await this.undoBatchConsumption(consumed.slices, "lost");
      throw new BadRequestException(
        "A perda deixaria menos peças do que já está reservado. " +
          "Cancele ou libere as reservas antes de dar a baixa.",
      );
    }
    await this.writeLedger(sku, "loss", -quantity, level, context, {
      batches: consumed.slices,
      cogs: consumed.cogs,
    });
    await this.projectToProduct(sku);
    return this.getStock(sku);
  }

  /**
   * Tira do físico o que sobrou em lote vencido e marca o lote. Roda antes de
   * toda reserva do SKU e também pela varredura periódica — nas duas pontas,
   * porque um SKU que ninguém tenta vender também não pode ficar anunciando
   * peça vencida.
   */
  async expireBatches(sku: Sku, correlationId?: string): Promise<number> {
    const now = new Date();
    const stale = await this.batchModel
      .find({ ...sku, expired: false, expiresAt: { $ne: null, $lte: now } })
      .lean<StockBatch[]>();

    let total = 0;
    for (const batch of stale) {
      const left = remainingOf(toFefoBatch(batch));
      const marked = await this.batchModel
        .findOneAndUpdate(
          { _id: batch._id, expired: false },
          { $set: { expired: true }, $inc: { lost: left } },
          { new: true },
        )
        .lean<StockBatch | null>();
      if (!marked || left <= 0) continue;
      total += left;
    }

    if (total === 0) return 0;

    const level = await this.levelModel
      .findOneAndUpdate(sku, { $inc: { onHand: -total, version: 1 } }, { new: true })
      .lean<StockLevel | null>();
    await this.writeLedger(sku, "expiry", -total, level ?? { onHand: 0, reserved: 0 }, {
      channel: "SYSTEM",
      reason: "Lote vencido",
      correlationId,
    });
    await this.projectToProduct(sku);
    return total;
  }

  /** Devolve ao disponível as reservas que ninguém confirmou a tempo. */
  async releaseExpiredReservations(limit = 200): Promise<number> {
    const stale = await this.reservationModel
      .find({ status: "held", expiresAt: { $ne: null, $lte: new Date() } })
      .limit(limit)
      .lean<StockReservation[]>();

    let released = 0;
    for (const reservation of stale) {
      const ok = await this.release(reservation.key, {
        channel: "SYSTEM",
        reason: "Reserva expirada",
      });
      if (ok) released += 1;
    }
    return released;
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────

  /**
   * Traz um produto que só tinha o número solto do `product.stock` para o
   * domínio de lote e ledger, sem inventar histórico: uma entrada única, no
   * canal `SYSTEM`, com o motivo dizendo que é saldo de abertura.
   *
   * É o que permite ligar o ledger em uma base existente sem migração
   * destrutiva — nada é apagado, e o saldo antigo vira o primeiro fato.
   */
  async ensureTracked(sku: Sku, correlationId?: string): Promise<boolean> {
    const existing = await this.levelModel.findOne(sku).lean<StockLevel | null>();
    if (existing) return true;

    const declared = await this.declaredStock(sku);
    if (declared == null) return false;

    try {
      await this.levelModel.create({ ...sku, onHand: 0, reserved: 0, version: 0 });
    } catch (error) {
      // Outra requisição criou o nível primeiro; o índice único fez o trabalho.
      if (!isDuplicateKey(error)) throw error;
      return true;
    }

    if (declared > 0) {
      await this.receive(
        sku,
        { quantity: declared, code: "ABERTURA" },
        {
          channel: "SYSTEM",
          reason: "Saldo de abertura do cadastro do produto",
          correlationId,
        },
      );
    }
    return true;
  }

  /** Todos os SKUs com saldo controlado — a base da conciliação. */
  async listTrackedSkus(): Promise<Sku[]> {
    const rows = await this.levelModel
      .find()
      .select("productId variantId")
      .lean<{ productId: string; variantId: string }[]>();
    return rows.map((row) => ({ productId: row.productId, variantId: row.variantId }));
  }

  /**
   * Confere o contador contra a soma do ledger. É a prova de que os dois
   * caminhos de escrita não se separaram — e o que a conciliação registra
   * quando se separam.
   */
  async auditSku(sku: Sku): Promise<{ counter: number; ledger: number; ok: boolean }> {
    const [level, sums] = await Promise.all([
      this.levelModel.findOne(sku).lean<StockLevel | null>(),
      this.ledgerModel.aggregate<{ _id: null; total: number }>([
        { $match: { ...sku, type: { $in: ["entry", "sale", "return", "adjustment", "loss", "expiry"] } } },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]),
    ]);
    const counter = level?.onHand ?? 0;
    const ledger = sums[0]?.total ?? 0;
    return { counter, ledger, ok: counter === ledger };
  }

  // ── Internos ───────────────────────────────────────────────────────────

  private async isTracked(sku: Sku): Promise<boolean> {
    return this.ensureTracked(sku);
  }

  /**
   * O estoque declarado no cadastro do produto — o campo que a loja e o
   * painel já usam. Ausente significa produção sob demanda, e é assim que o
   * domínio sabe que aquele SKU não tem saldo a controlar.
   */
  private async declaredStock(sku: Sku): Promise<number | null> {
    if (!Types.ObjectId.isValid(sku.productId)) return null;
    const product = await this.productModel
      .findById(sku.productId)
      .lean<{ stock?: number; variants?: { id: string; stock: number }[] } | null>();
    if (!product) return null;

    if (sku.variantId) {
      const variant = product.variants?.find((row) => row.id === sku.variantId);
      return variant ? variant.stock : null;
    }
    return typeof product.stock === "number" ? product.stock : null;
  }

  private async loadBatches(sku: Sku): Promise<FefoBatch[]> {
    const rows = await this.batchModel.find(sku).lean<StockBatch[]>();
    return rows.map(toFefoBatch);
  }

  /**
   * Aplica o plano FEFO nos lotes, um `$inc` condicional por lote. A condição
   * (`$expr` sobre o restante) é o que impede duas baixas simultâneas de
   * consumirem a mesma peça do mesmo lote.
   */
  private async consumeFefo(
    sku: Sku,
    quantity: number,
    column: "consumed" | "lost" = "consumed",
  ): Promise<{ slices: { batchId: string; quantity: number; unitCost: number }[]; cogs: number; shortfall: number }> {
    const slices: { batchId: string; quantity: number; unitCost: number }[] = [];
    let pending = quantity;
    let cogs = 0;

    // Relê a cada volta: outra baixa concorrente pode ter esvaziado o lote
    // que o plano anterior escolheu.
    for (let attempt = 0; attempt < 50 && pending > 0; attempt += 1) {
      const batches = sortForFefo(
        (await this.loadBatches(sku)).filter(
          (batch) => !batch.expiresAt || batch.expiresAt.getTime() > Date.now(),
        ),
      );
      const plan = planFefoConsumption(batches, pending);
      if (plan.slices.length === 0) break;

      for (const slice of plan.slices) {
        const applied = await this.batchModel
          .findOneAndUpdate(
            {
              _id: slice.batchId,
              $expr: {
                $gte: [
                  { $subtract: ["$quantity", { $add: ["$consumed", "$lost"] }] },
                  slice.quantity,
                ],
              },
            },
            { $inc: { [column]: slice.quantity } },
            { new: true },
          )
          .lean<StockBatch | null>();
        if (!applied) continue;

        slices.push(slice);
        cogs += slice.quantity * slice.unitCost;
        pending -= slice.quantity;
        if (pending === 0) break;
      }
    }

    return { slices, cogs, shortfall: pending };
  }

  /**
   * Tira do físico SEM deixar o saldo abaixo do que já está prometido.
   *
   * Ajuste e perda mexem no físico, e a reserva vive em outra coluna — sem
   * esta condição, dar baixa de uma peça quebrada que já estava reservada
   * deixaria `onHand < reserved`: o sistema teria prometido três peças e
   * possuiria duas, e o disponível continuaria dizendo zero como se estivesse
   * tudo bem. Melhor recusar e mandar cancelar a reserva primeiro.
   */
  private async takeFromOnHand(sku: Sku, quantity: number): Promise<StockLevel | null> {
    return this.levelModel
      .findOneAndUpdate(
        {
          ...sku,
          $expr: { $gte: [{ $subtract: ["$onHand", "$reserved"] }, quantity] },
        },
        { $inc: { onHand: -quantity, version: 1 } },
        { new: true },
      )
      .lean<StockLevel | null>();
  }

  /** Devolve aos lotes o que uma operação abortada já tinha consumido. */
  private async undoBatchConsumption(
    slices: { batchId: string; quantity: number }[],
    column: "consumed" | "lost",
  ): Promise<void> {
    for (const slice of slices) {
      await this.batchModel
        .updateOne({ _id: slice.batchId }, { $inc: { [column]: -slice.quantity } })
        .exec();
    }
  }

  private async bumpLevel(
    sku: Sku,
    inc: { onHand?: number; reserved?: number },
  ): Promise<StockLevel> {
    const updated = await this.levelModel
      .findOneAndUpdate(
        sku,
        { $inc: { ...inc, version: 1 }, $setOnInsert: sku },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean<StockLevel>();
    return updated;
  }

  private async writeLedger(
    sku: Sku,
    type: LedgerType,
    quantity: number,
    level: Pick<StockLevel, "onHand" | "reserved">,
    context: StockContext,
    extra: {
      batches?: { batchId: string; quantity: number; unitCost: number }[];
      cogs?: number;
      reservationKey?: string;
    } = {},
  ): Promise<void> {
    await this.ledgerModel.create({
      ...sku,
      type,
      quantity,
      channel: context.channel,
      onHandAfter: level.onHand,
      reservedAfter: level.reserved,
      batches: extra.batches ?? [],
      cogs: extra.cogs ?? 0,
      orderCode: context.orderCode,
      externalOrderSn: context.externalOrderSn,
      reservationKey: extra.reservationKey,
      actor: context.actor,
      reason: context.reason,
      correlationId: context.correlationId,
    });
  }

  /**
   * Espelha o disponível de volta em `product.stock` / `variants[].stock`.
   *
   * Os dois campos continuam existindo e continuam sendo o que a vitrine, o
   * catálogo e o painel leem — mas viraram PROJEÇÃO: o ledger manda, e este
   * método é o único que os escreve. Foi a alternativa a trocar o contrato da
   * API e reescrever a loja inteira para uma integração de marketplace.
   */
  private async projectToProduct(sku: Sku): Promise<void> {
    if (!Types.ObjectId.isValid(sku.productId)) return;
    const view = await this.getStock(sku);

    if (sku.variantId) {
      await this.productModel
        .updateOne(
          { _id: sku.productId, "variants.id": sku.variantId },
          { $set: { "variants.$.stock": view.available } },
        )
        .exec();
      return;
    }
    await this.productModel
      .updateOne({ _id: sku.productId }, { $set: { stock: view.available } })
      .exec();
  }

  private defaultHoldUntil(): Date {
    return new Date(Date.now() + DEFAULT_HOLD_MINUTES * 60_000);
  }

  private defaultBatchCode(): string {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    return `L-${stamp}-${now.getTime().toString(36).slice(-4).toUpperCase()}`;
  }
}

export function toFefoBatch(batch: StockBatch): FefoBatch {
  return {
    id: String(batch._id),
    quantity: batch.quantity,
    consumed: batch.consumed,
    lost: batch.lost,
    unitCost: batch.unitCost,
    expiresAt: batch.expiresAt ?? null,
    createdAt: batch.createdAt ?? new Date(0),
  };
}

/** O erro do índice único, que aqui é resultado esperado e não falha. */
export function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

export { skuKey };
