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

/**
 * De onde veio o pedido. `site` é o checkout da loja; `shopee`, um pedido
 * importado do marketplace. O canal é do PEDIDO, não do estoque — o estoque
 * continua sendo um só, e é justamente por isso que a origem precisa estar
 * gravada aqui.
 */
export const ORDER_CHANNELS = ["site", "shopee"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export type OrderDocument = HydratedDocument<Order>;

/** Identidade do pedido no sistema de origem, quando ele nasceu fora daqui. */
export class ExternalRefEmbed {
  source!: OrderChannel;
  shopId!: string;
  orderSn!: string;
  /** Último `order_status` visto na origem, para descartar evento atrasado. */
  remoteStatus?: string;
}

export class OrderItemEmbed {
  productId!: string;
  name!: string;
  /**
   * Id da variação escolhida (`variants[].id`). O carrinho sempre soube qual
   * era; o pedido só guardava o NOME dela, que não serve para achar o saldo
   * certo — duas variações podem ter nomes parecidos e o estoque é por id.
   */
  variantId?: string;
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
        variantId: String,
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

  @Prop({ required: true, enum: ORDER_CHANNELS, default: "site" })
  channel: OrderChannel;

  /**
   * Presente só em pedido importado. O índice único parcial abaixo é o que
   * garante que reimportar o mesmo `order_sn` não crie um segundo pedido.
   */
  @Prop({ type: Object })
  externalRef?: ExternalRefEmbed;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

/**
 * Um pedido por `order_sn` de cada loja — a trava de duplicidade da
 * importação, no banco e não em código.
 *
 * PARCIAL de propósito: os pedidos da loja não têm `externalRef`, e um índice
 * único comum trataria todos esses `null` como o mesmo valor, deixando gravar
 * só o primeiro. O filtro restringe a restrição a quem tem a chave.
 */
OrderSchema.index(
  { "externalRef.source": 1, "externalRef.shopId": 1, "externalRef.orderSn": 1 },
  {
    unique: true,
    partialFilterExpression: { "externalRef.orderSn": { $exists: true } },
  },
);

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
