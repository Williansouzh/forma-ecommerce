import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/**
 * Ordem do fluxo do ateliê: o pedido entra em `pending`, vira `paid` quando o
 * pagamento confirma e daí anda pela produção até `shipped`/`delivered`.
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "printing",
  "finishing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["pix", "credit_card", "boleto"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type OrderDocument = HydratedDocument<Order>;

export class OrderItemEmbed {
  productId!: string;
  name!: string;
  variantName?: string;
  quantity!: number;
  price!: number;
}

export class CustomerEmbed {
  email!: string;
  firstName!: string;
  lastName!: string;
  phone!: string;
  cpf?: string;
}

export class AddressEmbed {
  street!: string;
  number!: string;
  complement?: string;
  neighborhood!: string;
  city!: string;
  state!: string;
  zipCode!: string;
  country!: string;
}

/** Pedido da loja. Todos os valores em CENTAVOS (inteiros). */
@Schema({ collection: "orders", timestamps: true })
export class Order {
  _id: string;

  /** Código curto que a pessoa lê e diz no WhatsApp: C3D-4820. */
  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({
    type: [
      {
        _id: false,
        productId: String,
        name: String,
        variantName: String,
        quantity: Number,
        price: Number,
      },
    ],
    default: [],
  })
  items: OrderItemEmbed[];

  @Prop({ type: Object, required: true })
  customer: CustomerEmbed;

  @Prop({ type: Object })
  shippingAddress?: AddressEmbed;

  @Prop({ required: true, enum: PAYMENT_METHODS })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, enum: ORDER_STATUSES, default: "pending" })
  status: OrderStatus;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0, default: 0 })
  shipping: number;

  @Prop({ required: true, min: 0, default: 0 })
  discount: number;

  @Prop({ required: true, min: 0 })
  total: number;

  /** Preferência do Mercado Pago, quando o pagamento online está ligado. */
  @Prop({ trim: true })
  paymentPreferenceId?: string;

  @Prop({ trim: true })
  paymentUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.set("toJSON", {
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
