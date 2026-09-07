import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/**
 * Os slugs canônicos. `brinquedos` e `jogos` já existem aqui e no painel antes
 * de terem produto: assim a primeira peça de uma família nova é cadastrada sem
 * pedir deploy, e a vitrine passa a mostrar a prateleira sozinha.
 */
export const CATEGORY_SLUGS = [
  "decoracao",
  "colecionaveis",
  "brinquedos",
  "jogos",
  "presentes",
  "personalizados",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/**
 * Os slugs aposentados e para onde cada um vai.
 *
 * `utilidades` virou parte de "Casa e decoração" — suporte de mesa e
 * organizador são objeto de casa, e a família sozinha tinha uma peça.
 * `geek` era um recorte de nicho que deixava de fora o pai comprando um dino
 * articulado para o filho, que é exatamente a mesma peça.
 */
export const LEGACY_CATEGORY_MAP: Record<string, CategorySlug> = {
  utilidades: "decoracao",
  geek: "colecionaveis",
};

export const LEGACY_CATEGORY_SLUGS = Object.keys(LEGACY_CATEGORY_MAP);

/**
 * O enum do Mongoose aceita canônicos **e** aposentados; o DTO aceita só os
 * canônicos. Ou seja: documento antigo continua carregando e salvando, e
 * escrita nova não consegue reintroduzir um slug morto. É o que deixa a API
 * subir antes de o script de migração rodar, em vez de exigir os dois no
 * mesmo instante.
 */
export const ALL_CATEGORY_SLUGS = [
  ...CATEGORY_SLUGS,
  ...LEGACY_CATEGORY_SLUGS,
] as const;

/** Slug aposentado vira canônico; qualquer outro passa direto. */
export function canonicalCategory(slug: string): string {
  return LEGACY_CATEGORY_MAP[slug] ?? slug;
}

/** Um canônico mais os aposentados que caem nele — para filtrar no Mongo. */
export function categoryAliases(slug: string): string[] {
  const canonical = canonicalCategory(slug);
  const legacy = LEGACY_CATEGORY_SLUGS.filter(
    (old) => LEGACY_CATEGORY_MAP[old] === canonical,
  );
  return [canonical, ...legacy];
}

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

  @Prop({ required: true, enum: ALL_CATEGORY_SLUGS })
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
