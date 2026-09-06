import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import {
  OutboxMessage,
  OutboxMessageDocument,
  type OutboxStatus,
} from "./schemas/outbox-message.schema";

export interface EnqueueInput {
  topic: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  /** Adia a primeira tentativa — útil para esperar o estado remoto assentar. */
  delayMs?: number;
  correlationId?: string;
}

export interface OutboxStats {
  pending: number;
  processing: number;
  done: number;
  dead: number;
}

/** Espera entre tentativas: 2s, 8s, 32s, 2min, 8min — teto de 15 minutos. */
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 15 * 60_000;

/** Quanto tempo um worker pode segurar uma mensagem antes de perder o lock. */
const LOCK_MS = 60_000;

export function backoffFor(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 4 ** Math.max(0, attempt - 1));
}

/**
 * A fila persistente. Mongo em vez de Redis porque é o que o projeto já opera
 * e faz backup — uma fila em memória (ou em um serviço sem backup) perderia
 * exatamente as mensagens que existem para não se perder.
 *
 * O `claim` é um `findOneAndUpdate` condicional: dois workers competindo pela
 * mesma mensagem, só um recebe documento de volta. É a mesma guarda atômica
 * que o estoque usa, aplicada à concorrência entre processos.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(OutboxMessage.name)
    private readonly model: Model<OutboxMessageDocument>,
  ) {}

  /**
   * Grava a intenção. Repetir a mesma `dedupeKey` NÃO cria uma segunda linha:
   * só adianta a próxima tentativa, para o caso de o saldo ter mudado de novo
   * enquanto a mensagem esperava.
   */
  async enqueue(input: EnqueueInput): Promise<OutboxMessage | null> {
    const nextAttemptAt = new Date(Date.now() + (input.delayMs ?? 0));
    try {
      const created = await this.model.create({
        topic: input.topic,
        dedupeKey: input.dedupeKey,
        payload: input.payload,
        maxAttempts: input.maxAttempts ?? 5,
        nextAttemptAt,
        correlationId: input.correlationId ?? randomUUID(),
      });
      return created.toObject() as unknown as OutboxMessage;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      // Já existe uma pendente com esta chave. Atualizar o payload é o certo:
      // o saldo mais novo é o que vale, e o antigo já não interessa a ninguém.
      await this.model
        .findOneAndUpdate(
          { dedupeKey: input.dedupeKey, status: { $in: ["pending", "dead"] } },
          {
            $set: {
              payload: input.payload,
              status: "pending",
              nextAttemptAt,
            },
          },
        )
        .exec();
      return null;
    }
  }

  /**
   * Pega uma mensagem para trabalhar, com lock por tempo.
   *
   * A condição cobre os dois motivos de uma mensagem estar disponível: nunca
   * foi pega (`pending` com prazo vencido) ou foi pega por um worker que
   * morreu (`processing` com lock expirado). Sem o segundo caso, um deploy no
   * meio do processamento prenderia a mensagem para sempre.
   */
  async claim(topics: string[], workerId: string): Promise<OutboxMessage | null> {
    const now = new Date();
    return this.model
      .findOneAndUpdate(
        {
          topic: { $in: topics },
          $or: [
            { status: "pending", nextAttemptAt: { $lte: now } },
            { status: "processing", lockedUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            status: "processing",
            lockedBy: workerId,
            lockedUntil: new Date(now.getTime() + LOCK_MS),
          },
          $inc: { attempts: 1 },
        },
        { new: true, sort: { nextAttemptAt: 1 } },
      )
      .lean<OutboxMessage | null>();
  }

  async markDone(id: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: id },
        {
          $set: { status: "done", processedAt: new Date(), lastError: undefined },
          $unset: { lockedBy: "", lockedUntil: "" },
        },
      )
      .exec();
  }

  /**
   * Devolve a mensagem para a fila com espera crescente, ou a manda para a
   * fila de mortas quando as tentativas acabam.
   *
   * A mensagem NUNCA é apagada. Uma falha na Shopee não pode desfazer nada
   * local — ela só deixa uma linha visível no painel, para reprocessar quando
   * o outro lado voltar.
   */
  async markFailed(
    message: Pick<OutboxMessage, "_id" | "attempts" | "maxAttempts">,
    error: string,
  ): Promise<OutboxStatus> {
    const exhausted = message.attempts >= message.maxAttempts;
    const status: OutboxStatus = exhausted ? "dead" : "pending";

    await this.model
      .updateOne(
        { _id: message._id },
        {
          $set: {
            status,
            lastError: truncate(error),
            nextAttemptAt: new Date(Date.now() + backoffFor(message.attempts)),
          },
          $unset: { lockedBy: "", lockedUntil: "" },
        },
      )
      .exec();

    if (exhausted) {
      this.logger.error(
        `Mensagem ${String(message._id)} esgotou ${message.maxAttempts} tentativas: ${truncate(error)}`,
      );
    }
    return status;
  }

  /** Reprocessamento manual pelo painel: zera o relógio, não o histórico. */
  async retry(id: string): Promise<boolean> {
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: { $in: ["dead", "pending", "processing"] } },
        {
          $set: { status: "pending", nextAttemptAt: new Date(), attempts: 0 },
          $unset: { lockedBy: "", lockedUntil: "" },
        },
      )
      .lean();
    return Boolean(updated);
  }

  async retryAllDead(topic?: string): Promise<number> {
    const result = await this.model
      .updateMany(
        { status: "dead", ...(topic ? { topic } : {}) },
        {
          $set: { status: "pending", nextAttemptAt: new Date(), attempts: 0 },
          $unset: { lockedBy: "", lockedUntil: "" },
        },
      )
      .exec();
    return result.modifiedCount;
  }

  async list(
    filter: { status?: OutboxStatus; topic?: string; limit?: number } = {},
  ): Promise<OutboxMessage[]> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.topic) query.topic = filter.topic;
    return this.model
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(Math.min(filter.limit ?? 50, 200))
      .lean<OutboxMessage[]>();
  }

  async stats(topicPrefix?: string): Promise<OutboxStats> {
    const match = topicPrefix
      ? { topic: { $regex: `^${topicPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } }
      : {};
    const rows = await this.model.aggregate<{ _id: OutboxStatus; total: number }>([
      { $match: match },
      { $group: { _id: "$status", total: { $sum: 1 } } },
    ]);
    const base: OutboxStats = { pending: 0, processing: 0, done: 0, dead: 0 };
    for (const row of rows) base[row._id] = row.total;
    return base;
  }

  /** Higiene: mensagens entregues não precisam ficar para sempre. */
  async purgeDone(olderThanDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
    const result = await this.model
      .deleteMany({ status: "done", processedAt: { $lte: cutoff } })
      .exec();
    return result.deletedCount;
  }
}

function truncate(value: string, max = 400): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
