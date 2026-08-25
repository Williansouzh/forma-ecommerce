import type { Product } from "@/types/product";

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

function mapProduct(raw: RawProduct): Product {
  const images = Array.isArray(raw.images) ? raw.images : [];
  return {
    ...(raw as unknown as Product),
    images: images.map((image, index) => {
      const img = image as { url: string; alt?: string };
      return {
        id: `${String(raw.id ?? raw.slug)}-img-${index}`,
        url: img.url,
        alt: img.alt ?? "",
        isPrimary: index === 0,
        order: index,
      };
    }),
    variants: [],
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
  const rows = await request<RawProduct[]>(`/products${query ? `?${query}` : ""}`);
  return rows.map(mapProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const raw = await request<RawProduct | null>(`/products/${slug}`);
    return raw ? mapProduct(raw) : null;
  } catch {
    return null;
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
