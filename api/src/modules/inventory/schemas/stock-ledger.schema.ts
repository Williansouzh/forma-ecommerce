import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/**
 * O que aconteceu com o estoque. Cada tipo é um FATO, não um estado — o
 * ledger não é atualizado nem apagado, só recebe linhas novas.
 */
export const LEDGER_TYPES = [
  /** Chegada de peças: produção terminada, compra, devolução ao lote. */
  "entry",
  /** Venda confirmada: saiu de vez, com o lote FEFO já escolhido. */
  "sale",
  /** Reserva do checkout: ainda não saiu, mas não pode ser vendido de novo. */
  "reserve",
  /** Reserva desfeita: carrinho abandonado, pedido cancelado antes de pagar. */
  "release",
  /** Volta ao estoque depois de uma venda confirmada (devolução, reembolso). */
  "return",
  /** Correção manual do saldo pelo painel, com motivo obrigatório. */
  "adjustment",
  /** Peça quebrada, extraviada, refugo de impressão. */
  "loss",
  /** Lote passou da validade e saiu do disponível. */
  "expiry",
] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

/**
 * De onde veio a movimentação. `SHOPEE` é o canal exigido para tudo que a
 * integração causa — é por ele que a auditoria separa o que é da loja do que
 * é do marketplace.
 */
export const STOCK_CHANNELS = ["SITE", "SHOPEE", "ADMIN", "SYSTEM"] as const;
export type StockChannel = (typeof STOCK_CHANNELS)[number];

export type StockLedgerEntryDocument = HydratedDocument<StockLedgerEntry>;

/** De qual lote saiu cada pedaço de uma venda, com o custo congelado ali. */
export class LedgerBatchSliceEmbed {
  batchId!: string;
  quantity!: number;
  /** Custo unitário em CENTAVOS no momento da baixa. Não muda depois. */
  unitCost!: number;
}

/**
 * Linha do ledger imutável de estoque.
 *
 * Imutabilidade não é convenção aqui: o schema recusa `save` de documento já
 * gravado e as rotas de update/delete não existem. Corrigir um erro é lançar
 * um `adjustment` que se some ao erro, do jeito que contabilidade faz.
 */
@Schema({ collection: "stock_ledger", timestamps: { createdAt: true, updatedAt: false } })
export class StockLedgerEntry {
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  /**
   * Id da variação (`variants[].id`). String vazia para produto simples —
   * assim o par (produto, variação) é sempre uma chave completa, sem `null`
   * atrapalhando índice único.
   */
  /**
   * `required` do Mongoose recusa string vazia (o teste de `required` para
   * String é `length > 0`), e vazio é justamente o valor válido do produto
   * simples. O default garante a presença; o tipo garante o resto.
   */
  @Prop({ type: String, default: "" })
  variantId: string;

  @Prop({ required: true, enum: LEDGER_TYPES })
  type: LedgerType;

  /**
   * Quantidade SINALIZADA em unidades: negativa quando sai do disponível.
   * Somar a coluna inteira de um SKU tem de bater com o saldo — é essa a
   * prova que a conciliação usa.
   */
  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, enum: STOCK_CHANNELS, default: "SYSTEM" })
  channel: StockChannel;

  /** Saldo físico depois desta linha, para auditar sem reprocessar tudo. */
  @Prop({ required: true })
  onHandAfter: number;

  /** Reservado depois desta linha. */
  @Prop({ required: true })
  reservedAfter: number;

  /** Lotes consumidos, quando a linha é uma saída FEFO. */
  @Prop({
    type: [{ _id: false, batchId: String, quantity: Number, unitCost: Number }],
    default: [],
  })
  batches: LedgerBatchSliceEmbed[];

  /** COGS congelado da linha, em CENTAVOS. Soma dos lotes consumidos. */
  @Prop({ required: true, default: 0 })
  cogs: number;

  /** Pedido interno que causou a linha, quando houve um. */
  @Prop({ trim: true })
  orderCode?: string;

  /** `order_sn` da Shopee, quando a origem é o marketplace. */
  @Prop({ trim: true })
  externalOrderSn?: string;

  /** Chave da reserva, para casar reserve/release/sale da mesma compra. */
  @Prop({ trim: true, index: true })
  reservationKey?: string;

  /** Quem pediu, quando foi ação manual: e-mail do admin autenticado. */
  @Prop({ trim: true })
  actor?: string;

  /** Motivo em texto — obrigatório para ajuste e perda, pela validação. */
  @Prop({ trim: true })
  reason?: string;

  /** Amarra a linha à requisição/job que a produziu, ponta a ponta. */
  @Prop({ trim: true, index: true })
  correlationId?: string;

  createdAt: Date;
}

export const StockLedgerEntrySchema =
  SchemaFactory.createForClass(StockLedgerEntry);

// A leitura da auditoria é sempre "este SKU, do mais novo pro mais velho".
StockLedgerEntrySchema.index({ productId: 1, variantId: 1, createdAt: -1 });

/**
 * A trava da imutabilidade. Sem isto, `doc.quantity = 0; doc.save()` reescreve
 * um fato — e um ledger que aceita reescrita não serve de prova de nada.
 */
StockLedgerEntrySchema.pre("save", function (next) {
  if (!this.isNew) {
    next(new Error("O ledger de estoque é imutável: linha já gravada."));
    return;
  }
  next();
});

for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"] as const) {
  StockLedgerEntrySchema.pre(op, function (next) {
    next(new Error(`O ledger de estoque é imutável: ${op} não é permitido.`));
  });
}

StockLedgerEntrySchema.set("toJSON", {
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
