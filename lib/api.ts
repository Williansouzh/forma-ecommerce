import type { Product } from "@/types/product";
import { PRODUCTS, getProduct } from "@/data/products";

export interface ApiProductFilters {
  category?: string;
  q?: string;
  sort?: "relevance" | "price-asc" | "price-desc" | "newest";
  featured?: boolean;
  limit?: number;
}

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = `${API_URL}/api/v1`;

type RawProduct = Record<string, unknown>;

function normalizeImageUrl(url: string): string {
  if (url.endsWith("-03.jpg")) return url.replace("-03.jpg", "-03.svg");
  return url;
}

function mapProduct(raw: RawProduct): Product {
  const localProduct = getProduct(String(raw.slug ?? ""));
  const images = Array.isArray(raw.images) ? raw.images : [];
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  const mappedImages = images.map((image, index) => {
    const img = image as { url: string; alt?: string };
    return {
      id: `${String(raw.id ?? raw.slug)}-img-${index}`,
      url: normalizeImageUrl(img.url),
      alt: img.alt ?? "",
      isPrimary: index === 0,
      order: index,
    };
  });
  return {
    ...localProduct,
    ...(raw as unknown as Product),
    images: mappedImages.length > 0 ? mappedImages : (localProduct?.images ?? []),
    variants:
      variants.length > 0
        ? (variants as Product["variants"])
        : (localProduct?.variants ?? []),
    rating:
      typeof raw.rating === "number" ? raw.rating : localProduct?.rating,
    reviewCount:
      typeof raw.reviewCount === "number"
        ? raw.reviewCount
        : localProduct?.reviewCount,
    stock:
      typeof raw.stock === "number" ? raw.stock : localProduct?.stock,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchProducts(
  filters: ApiProductFilters = {}
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.featured) params.set("featured", "1");
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  // Com a API fora, seguimos só com o catálogo local: a mesclagem e os filtros
  // abaixo já sabem lidar com uma lista remota vazia.
  let rows: RawProduct[] = [];
  try {
    rows = await request<RawProduct[]>(`/products${query ? `?${query}` : ""}`);
  } catch {
    rows = [];
  }
  const mapped = rows.map(mapProduct);
  const existingSlugs = new Set(mapped.map((product) => product.slug));
  const localOnly = PRODUCTS.filter((product) => !existingSlugs.has(product.slug));
  let result = [...mapped, ...localOnly];

  if (filters.category) {
    result = result.filter((product) => product.category === filters.category);
  }
  if (filters.q) {
    const term = filters.q.toLowerCase();
    result = result.filter((product) =>
      [product.name, product.shortDescription, product.category, ...product.tags]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }
  if (filters.featured) {
    result = result.filter((product) => product.isFeatured);
  }
  if (filters.sort === "price-asc") {
    result = [...result].sort((a, b) => a.price - b.price);
  }
  if (filters.sort === "price-desc") {
    result = [...result].sort((a, b) => b.price - a.price);
  }
  if (filters.sort === "newest") {
    result = [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  if (filters.limit) result = result.slice(0, filters.limit);
  return result;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const raw = await request<RawProduct | null>(`/products/${slug}`);
    return raw ? mapProduct(raw) : null;
  } catch {
    return getProduct(slug) ?? null;
  }
}

export async function fetchRelatedProducts(
  product: Pick<Product, "slug" | "category">,
  limit = 4
): Promise<Product[]> {
  try {
    const rows = await request<RawProduct[]>(
      `/products?category=${encodeURIComponent(product.category)}&limit=${limit + 1}`
    );
    return rows
      .map(mapProduct)
      .filter((item) => item.slug !== product.slug)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function submitCustomRequest(payload: unknown) {
  const response = await fetch("/api/custom-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Falha ao enviar solicitação");
  return response.json();
}
