import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type StockBatchDocument = HydratedDocument<StockBatch>;

/**
 * Lote de peças com a mesma origem, o mesmo custo e — quando o material pede
 * — a mesma validade. É do lote que a baixa FEFO sai, e é dele que vem o
 * custo congelado no COGS da venda.
 *
 * `remaining` não é campo: é `quantity - consumed - lost`. Guardar o restante
 * separado abriria a porta para ele divergir das três colunas que o explicam.
 */
@Schema({ collection: "stock_batches", timestamps: true })
export class StockBatch {
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  /**
   * `required` do Mongoose recusa string vazia (o teste de `required` para
   * String é `length > 0`), e vazio é justamente o valor válido do produto
   * simples. O default garante a presença; o tipo garante o resto.
   */
  @Prop({ type: String, default: "" })
  variantId: string;

  /** Código legível do lote: `L-2026-09-05-01`, o que estiver na etiqueta. */
  @Prop({ required: true, trim: true })
  code: string;

  /** Quanto entrou. Nunca muda depois da entrada. */
  @Prop({ required: true, min: 0 })
  quantity: number;

  /** Quanto já saiu por venda confirmada. Só cresce. */
  @Prop({ required: true, min: 0, default: 0 })
  consumed: number;

  /** Quanto saiu por perda ou vencimento. Só cresce. */
  @Prop({ required: true, min: 0, default: 0 })
  lost: number;

  /** Custo unitário em CENTAVOS. É o que congela no COGS da venda. */
  @Prop({ required: true, min: 0, default: 0 })
  unitCost: number;

  /**
   * Validade. Ausente = não vence (o caso normal de peça impressa). Presente,
   * manda no FEFO e faz o lote sair do disponível quando passa.
   */
  @Prop({ index: true })
  expiresAt?: Date;

  /** Verdadeiro depois que a rotina de vencimento já baixou o que sobrou. */
  @Prop({ required: true, default: false })
  expired: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const StockBatchSchema = SchemaFactory.createForClass(StockBatch);

/**
 * A ordem exata do FEFO, virada em índice: primeiro o que vence antes, e a
 * data ausente por último. O Mongo ordena `null` ANTES de qualquer data em
 * ordem crescente, então a consulta não pode pedir só `expiresAt: 1` — quem
 * resolve isso é `sortForFefo`, e este índice serve os dois trechos dela.
 */
StockBatchSchema.index({ productId: 1, variantId: 1, expiresAt: 1, createdAt: 1 });

StockBatchSchema.set("toJSON", {
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
