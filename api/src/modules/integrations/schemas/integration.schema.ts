import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const INTEGRATION_KEYS = [
  "mercadopago",
  "whatsapp",
  "melhorenvio",
  "instagram",
  "nfe",
  "shopee",
] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export type IntegrationDocument = HydratedDocument<Integration>;

/**
 * Uma integração externa. `config` guarda o que o painel pode ler de volta;
 * `secrets` guarda chave privada e token, e NUNCA sai desta camada — o
 * controller devolve só uma dica mascarada.
 */
@Schema({ collection: "integrations", timestamps: true })
export class Integration {
  _id: string;

  @Prop({ required: true, unique: true, enum: INTEGRATION_KEYS })
  key: IntegrationKey;

  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop({ type: Object, default: {} })
  config: Record<string, unknown>;

  @Prop({ type: Object, default: {}, select: false })
  secrets: Record<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);
