import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const OUTBOX_STATUSES = [
  /** Esperando a vez. */
  "pending",
  /** Um worker pegou e está processando; o lock diz até quando. */
  "processing",
  /** Entregue. */
  "done",
  /** Estourou as tentativas. Fila de mensagens mortas — só sai na mão. */
  "dead",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export type OutboxMessageDocument = HydratedDocument<OutboxMessage>;

/**
 * Uma intenção de efeito colateral, gravada no MESMO banco que o efeito local
 * que a causou — o *outbox pattern*.
 *
 * O problema que ela resolve é a janela do enunciado: "falha depois da
 * atualização local e antes da atualização remota". Chamar a Shopee dentro do
 * fluxo da venda deixaria essa janela aberta e ainda amarraria o checkout à
 * latência do marketplace. Aqui a venda grava a linha e termina; a entrega é
 * problema do worker, que pode tentar de novo pelo tempo que precisar.
 *
 * O caminho inverso ("falha depois da remota e antes da confirmação local") é
 * aceito de propósito: a mensagem é reentregue, o `update_stock` da Shopee é
 * idempotente por natureza (manda o saldo absoluto, não um delta), e reenviar
 * o mesmo número não causa dano.
 */
@Schema({ collection: "outbox_messages", timestamps: true })
export class OutboxMessage {
  _id: string;

  /** Assunto: `shopee.stock.sync`, `shopee.order.import`, … */
  @Prop({ required: true, trim: true, index: true })
  topic: string;

  /**
   * Identidade do EFEITO pretendido, não da mensagem. Enfileirar duas vezes a
   * sincronização do mesmo SKU produz uma linha só — o segundo insert bate no
   * índice único e é descartado, porque mandar o saldo atual duas vezes não
   * adianta nada.
   */
  @Prop({ required: true, unique: true, trim: true })
  dedupeKey: string;

  @Prop({ type: Object, required: true, default: {} })
  payload: Record<string, unknown>;

  @Prop({ required: true, enum: OUTBOX_STATUSES, default: "pending" })
  status: OutboxStatus;

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ required: true, default: 5 })
  maxAttempts: number;

  /** Antes disto, o worker não pega. É o backoff exponencial materializado. */
  @Prop({ required: true, default: () => new Date(), index: true })
  nextAttemptAt: Date;

  /**
   * Até quando o lock deste worker vale. Um processo que morre segurando a
   * mensagem não a prende para sempre: passado o prazo, outro worker a pega.
   */
  @Prop()
  lockedUntil?: Date;

  @Prop({ trim: true })
  lockedBy?: string;

  /** Só a mensagem do erro, nunca o corpo da resposta — pode trazer token. */
  @Prop({ trim: true })
  lastError?: string;

  @Prop({ trim: true, index: true })
  correlationId?: string;

  @Prop()
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OutboxMessageSchema = SchemaFactory.createForClass(OutboxMessage);

// A consulta do worker: o que está pronto para rodar, mais velho primeiro.
OutboxMessageSchema.index({ status: 1, nextAttemptAt: 1 });

OutboxMessageSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: unknown) => {
    const record = ret as Record<string, unknown>;
    record.id = String(record._id);
    delete record._id;
    delete record.__v;
    return record;
  },
});
