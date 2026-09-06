import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { STOCK_CHANNELS, type StockChannel } from "./stock-ledger.schema";

export const RESERVATION_STATUSES = [
  /** Segurando o estoque; ainda pode virar venda ou voltar. */
  "held",
  /** Virou venda confirmada: o físico já saiu pelo FEFO. */
  "consumed",
  /** Devolvida ao disponível sem virar venda. */
  "released",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type StockReservationDocument = HydratedDocument<StockReservation>;

/**
 * A promessa feita a uma compra: tanto deste SKU está guardado para ela.
 *
 * A `key` é o que torna reservar idempotente. Um webhook repetido da Shopee
 * traz a mesma chave, o índice único recusa a segunda inserção, e o estoque
 * não é comprometido duas vezes — mesma ideia do `{ code, status: "pending" }`
 * que já protege o webhook do Mercado Pago.
 */
@Schema({ collection: "stock_reservations", timestamps: true })
export class StockReservation {
  _id: string;

  /**
   * Identidade da reserva. Para a loja: `SITE:<codigo do pedido>:<sku>`.
   * Para o marketplace: `SHOPEE:<shopId>:<orderSn>:<sku>`.
   */
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ required: true, index: true })
  productId: string;

  /**
   * `required` do Mongoose recusa string vazia (o teste de `required` para
   * String é `length > 0`), e vazio é justamente o valor válido do produto
   * simples. O default garante a presença; o tipo garante o resto.
   */
  @Prop({ type: String, default: "" })
  variantId: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, enum: RESERVATION_STATUSES, default: "held" })
  status: ReservationStatus;

  @Prop({ required: true, enum: STOCK_CHANNELS, default: "SITE" })
  channel: StockChannel;

  @Prop({ trim: true })
  orderCode?: string;

  @Prop({ trim: true })
  externalOrderSn?: string;

  /**
   * Quando a reserva deixa de valer se ninguém confirmar. Um checkout
   * abandonado não pode prender a última peça para sempre.
   */
  @Prop({ index: true })
  expiresAt?: Date;

  @Prop({ trim: true })
  correlationId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const StockReservationSchema =
  SchemaFactory.createForClass(StockReservation);

// A varredura de reservas vencidas: só as que ainda seguram estoque.
StockReservationSchema.index({ status: 1, expiresAt: 1 });

StockReservationSchema.set("toJSON", {
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
