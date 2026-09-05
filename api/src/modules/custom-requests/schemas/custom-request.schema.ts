import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const CUSTOM_TYPES = [
  "character",
  "gift",
  "miniature",
  "decoration",
  "functional",
  "other",
] as const;
export type CustomType = (typeof CUSTOM_TYPES)[number];

/** Do pedido de orçamento até a peça pronta. `received` é "sem resposta". */
export const REQUEST_STATUSES = [
  "received",
  "analyzing",
  "quoted",
  "approved",
  "modeling",
  "printing",
  "finished",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type CustomRequestDocument = HydratedDocument<CustomRequest>;

/** Orçamento sob medida pedido pelo formulário da loja. */
@Schema({ collection: "custom_requests", timestamps: true })
export class CustomRequest {
  _id: string;

  @Prop({ required: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  customerName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  customerEmail: string;

  @Prop({ trim: true })
  customerPhone?: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: [String], default: [] })
  referenceImages: string[];

  @Prop({ required: true, enum: CUSTOM_TYPES, default: "other" })
  type: CustomType;

  /** Em centavos, quando a pessoa informa um teto. */
  @Prop({ min: 0 })
  budget?: number;

  @Prop({ trim: true })
  deadline?: string;

  @Prop({ required: true, enum: REQUEST_STATUSES, default: "received" })
  status: RequestStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const CustomRequestSchema =
  SchemaFactory.createForClass(CustomRequest);
