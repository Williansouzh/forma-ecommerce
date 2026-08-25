export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary?: boolean;
  order?: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  colorHex?: string;
  priceAdjustment: number;
  stock: number;
  images?: string[];
}

export interface Dimensions {
  width: number; // mm
  height: number; // mm
  depth: number; // mm
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  /** Preço em centavos */
  price: number;
  originalPrice?: number;
  category: string;
  tags: string[];
  images: ProductImage[];
  variants?: ProductVariant[];
  dimensions?: Dimensions;
  weight?: number;
  material?: string;
  productionTime?: number;
  stock?: number;
  isAvailable: boolean;
  isCustom?: boolean;
  isFeatured: boolean;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ProductStatus = "in_stock" | "low_stock" | "made_to_order" | "sold_out";
