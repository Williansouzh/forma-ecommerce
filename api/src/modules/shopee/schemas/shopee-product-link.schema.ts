import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const LINK_STATUSES = [
  /** Confirmada: sincroniza automaticamente. */
  "active",
  /** Casada por SKU mas ainda não confirmada por gente. Não sincroniza. */
  "pending",
  /** Desligada de propósito; fica no cadastro para não se perder o histórico. */
  "disabled",
  /** A última sincronização falhou. Continua tentando, mas aparece em vermelho. */
  "error",
] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export type ShopeeProductLinkDocument = HydratedDocument<ShopeeProductLink>;

/**
 * A associação entre um SKU interno e um anúncio da Shopee.
 *
 * Por que não casar por nome: "Cactos de Mesa" e "Cactos de mesa — trio" são
 * a mesma peça para uma pessoa e produtos diferentes para um `includes()`. E
 * o erro é caro nos dois sentidos — anunciar estoque de outra peça vende o
 * que não existe. O casamento é por `item_id`/`model_id`, que a Shopee emite;
 * o SKU só serve para PROPOR uma associação, que uma pessoa confirma.
 *
 * Produto com variação tem uma linha POR VARIAÇÃO: `model_id` diferente,
 * saldo diferente, margem diferente se for o caso.
 */
@Schema({ collection: "shopee_product_links", timestamps: true })
export class ShopeeProductLink {
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  /** String vazia para produto simples — mesma convenção do estoque. */
  @Prop({ type: String, default: "" })
  variantId: string;

  /** SKU interno, quando existir. Só orienta o casamento; não é a chave. */
  @Prop({ type: String, default: "", trim: true })
  internalSku: string;

  @Prop({ required: true, trim: true, index: true })
  shopId: string;

  /** `item_id` do anúncio na Shopee. */
  @Prop({ required: true, trim: true })
  itemId: string;

  /**
   * `model_id` da variação. `"0"` é o valor que a própria Shopee usa para
   * item sem variação, e é o que vai em `update_stock`.
   */
  @Prop({ type: String, default: "0", trim: true })
  modelId: string;

  /** SKU cadastrado do lado da Shopee, para conferência humana. */
  @Prop({ type: String, default: "", trim: true })
  shopeeSku: string;

  @Prop({ required: true, enum: LINK_STATUSES, default: "pending" })
  status: LinkStatus;

  /**
   * Quantas unidades segurar deste anúncio. Por SKU porque a peça que vende
   * muito precisa de mais folga que a que vende uma por mês.
   */
  @Prop({ required: true, min: 0, default: 0 })
  safetyMargin: number;

  /** Desliga a sincronização automática deste SKU sem apagar a associação. */
  @Prop({ required: true, default: true })
  autoSync: boolean;

  @Prop()
  lastSyncedAt?: Date;

  /** Último saldo que ENVIAMOS. Serve para não repetir chamada à toa. */
  @Prop()
  lastPushedStock?: number;

  /** Último saldo que a Shopee nos DISSE ter. A base da divergência. */
  @Prop()
  lastRemoteStock?: number;

  @Prop()
  lastRemoteCheckedAt?: Date;

  @Prop({ trim: true })
  lastError?: string;

  @Prop({ required: true, default: 0 })
  failureCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ShopeeProductLinkSchema =
  SchemaFactory.createForClass(ShopeeProductLink);

/**
 * Um anúncio da Shopee pertence a UM SKU interno. Sem isto, duas associações
 * apontando para o mesmo `model_id` mandariam saldos diferentes para o mesmo
 * anúncio, e o último a escrever ganharia — de forma imprevisível.
 */
ShopeeProductLinkSchema.index(
  { shopId: 1, itemId: 1, modelId: 1 },
  { unique: true },
);

/** E um SKU interno é anunciado uma vez por loja. */
ShopeeProductLinkSchema.index(
  { shopId: 1, productId: 1, variantId: 1 },
  { unique: true },
);

ShopeeProductLinkSchema.set("toJSON", {
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
