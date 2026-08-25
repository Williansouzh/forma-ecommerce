import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const CATEGORY_SLUGS = [
  "bonecos",
  "decoracao",
  "geek",
  "miniaturas",
  "presentes",
  "personalizados",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type ProductDocument = HydratedDocument<Product>;

export class ProductImageEmbed {
  url!: string;
  alt!: string;
}

export class DimensionsEmbed {
  width!: number;
  height!: number;
  depth!: number;
}

/**
 * Produto da loja FORMA. Preços em CENTAVOS (inteiros).
 * Sem controle de estoque — produção sob demanda.
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

  @Prop({ trim: true })
  material?: string;

  @Prop({ min: 0 })
  productionTime?: number;

  @Prop()
  dimensions?: DimensionsEmbed;

  @Prop({ min: 0 })
  weight?: number;

  @Prop({ required: true, default: true })
  isAvailable: boolean;

  @Prop({ required: true, default: false })
  isFeatured: boolean;

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
