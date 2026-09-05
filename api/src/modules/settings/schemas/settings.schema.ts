import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SettingsDocument = HydratedDocument<Settings>;

/** Documento único: existe no máximo uma linha, com esta chave. */
export const SETTINGS_KEY = "store";

/**
 * Ajustes que o ateliê muda sozinho, sem deploy. Valores em CENTAVOS quando
 * são dinheiro, para bater com o resto do domínio.
 */
@Schema({ collection: "settings", timestamps: true })
export class Settings {
  _id: string;

  @Prop({ required: true, unique: true, default: SETTINGS_KEY })
  key: string;

  @Prop({ required: true, min: 0, default: 40000 })
  freeShippingThreshold: number;

  @Prop({ required: true, min: 0, max: 50, default: 5 })
  pixDiscountPercent: number;

  @Prop({ required: true, min: 1, default: 5 })
  defaultProductionDays: number;

  @Prop({ required: true, trim: true, default: "c3dcriativ" })
  atelierName: string;

  @Prop({ required: true, trim: true, default: "Campina Grande — PB" })
  atelierCity: string;

  @Prop({ required: true, trim: true, default: "Seg a sáb · 8h às 18h" })
  atelierHours: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);

SettingsSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: unknown) => {
    const record = ret as Record<string, unknown>;
    delete record._id;
    delete record.__v;
    return record;
  },
});
