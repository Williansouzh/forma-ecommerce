import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const CATEGORY_SLUGS = [
  "decoracao",
  "geek",
  "presentes",
  "utilidades",
  "personalizados",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type ProductDocument = HydratedDocument<Product>;

export class ProductImageEmbed {
  url!: string;
  alt!: string;
}

/** Cor de filamento oferecida na peça. `id` vem do painel, não do Mongo. */
export class ProductVariantEmbed {
  id!: string;
  name!: string;
  colorHex?: string;
  priceAdjustment!: number;
  stock!: number;
}

export class DimensionsEmbed {
  width!: number;
  height!: number;
  depth!: number;
}

/**
 * Produto da loja. Preços em CENTAVOS (inteiros).
 * `stock` é opcional: sem valor, a peça é produzida sob demanda.
 */
@Schema({ collection: "products", timestamps: true })
export class Product {
  _id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, trim: true })
  shortDescription: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  originalPrice?: number;

  @Prop({ required: true, enum: CATEGORY_SLUGS })
  category: CategorySlug;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    type: [{ url: String, alt: String }],
    validate: (v: ProductImageEmbed[]) => v.length > 0,
  })
  images: ProductImageEmbed[];

  @Prop({
    type: [
      {
        _id: false,
        id: String,
        name: String,
        colorHex: String,
        priceAdjustment: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  variants: ProductVariantEmbed[];

  @Prop({ trim: true })
  material?: string;

  @Prop({ min: 0 })
  productionTime?: number;

  /** Peças prontas em estoque. Ausente = produção sob demanda. */
  @Prop({ min: 0 })
  stock?: number;

  @Prop()
  dimensions?: DimensionsEmbed;

  @Prop({ min: 0 })
  weight?: number;

  @Prop({ required: true, default: true })
  isAvailable: boolean;

  @Prop({ required: true, default: false })
  isFeatured: boolean;

  /** Peça que aceita personalização (nome, cor, medida) sob encomenda. */
  @Prop({ required: true, default: false })
  isCustom: boolean;

  @Prop({ trim: true })
  badge?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.set("toJSON", {
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
