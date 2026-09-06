import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const EVENT_STATUSES = ["received", "processed", "ignored", "failed"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type ShopeeEventDocument = HydratedDocument<ShopeeEvent>;

/**
 * O registro de que um evento da Shopee já passou por aqui.
 *
 * A chave é a do enunciado — `SHOPEE + shopId + orderSn + eventType` — e é
 * ÚNICA no banco. É essa restrição, e não uma checagem em código, que impede
 * o processamento duplo: dois workers competindo pelo mesmo push repetido,
 * um insere e o outro leva erro 11000, que aqui é resultado esperado.
 *
 * Guardar o evento é também a auditoria de tudo que a Shopee mandou, inclusive
 * o que foi ignorado — sem isso, "por que este pedido não entrou?" não tem
 * resposta.
 */
@Schema({ collection: "shopee_events", timestamps: true })
export class ShopeeEvent {
  _id: string;

  /** `SHOPEE:<shopId>:<orderSn>:<eventType>` */
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true, index: true })
  shopId: string;

  @Prop({ type: String, default: "", trim: true, index: true })
  orderSn: string;

  /** Status da Shopee, ou o nome do gatilho quando não é de pedido. */
  @Prop({ required: true, trim: true })
  eventType: string;

  /** `code` do push, quando veio por push. Ausente na varredura periódica. */
  @Prop()
  pushCode?: number;

  @Prop({ required: true, enum: EVENT_STATUSES, default: "received" })
  status: EventStatus;

  /** Por que foi ignorado, ou o que foi feito. Texto para gente ler. */
  @Prop({ trim: true })
  outcome?: string;

  @Prop({ trim: true, index: true })
  correlationId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ShopeeEventSchema = SchemaFactory.createForClass(ShopeeEvent);

ShopeeEventSchema.set("toJSON", {
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
