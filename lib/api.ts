import type { Product } from "@/types/product";
import type { components } from "@/types/generated/api-v1";
import { PRODUCTS, getProduct } from "@/data/products";

/**
 * A forma exata que a API devolve, gerada do contrato OpenAPI — não escrita à
 * mão. Renomear um campo no `product.schema.ts` da API agora quebra o build
 * daqui, em vez de aparecer como campo vazio na tela.
 */
type ApiProduct = components["schemas"]["Product"];

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

/**
 * Traduz o produto da API para o tipo de domínio da loja.
 *
 * A tradução é explícita campo a campo de propósito: o `_id` do Mongo vira
 * `id`, a imagem ganha `id`/`isPrimary`/`order` que só existem no front, e
 * `rating`/`reviewCount` não existem na API — vêm do catálogo local. Um
 * spread cru mascararia as três diferenças.
 */
function mapProduct(raw: ApiProduct): Product {
  const localProduct = getProduct(raw.slug);
  const mappedImages = raw.images.map((image, index) => ({
    id: `${raw._id}-img-${index}`,
    url: image.url,
    alt: image.alt,
    isPrimary: index === 0,
    order: index,
  }));

  return {
    id: raw._id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    shortDescription: raw.shortDescription,
    price: raw.price,
    originalPrice: raw.originalPrice,
    category: raw.category,
    tags: raw.tags,
    images: mappedImages.length > 0 ? mappedImages : (localProduct?.images ?? []),
    variants:
      raw.variants.length > 0 ? raw.variants : (localProduct?.variants ?? []),
    dimensions: raw.dimensions,
    weight: raw.weight,
    material: raw.material,
    productionTime: raw.productionTime,
    stock: raw.stock ?? localProduct?.stock,
    isAvailable: raw.isAvailable,
    isCustom: raw.isCustom,
    isFeatured: raw.isFeatured,
    badge: raw.badge,
    // A API não guarda avaliação; enquanto não guardar, é o catálogo local
    // que responde — e some sozinho quando o campo existir lá.
    rating: localProduct?.rating,
    reviewCount: localProduct?.reviewCount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
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
  let rows: ApiProduct[] = [];
  try {
    rows = await request<ApiProduct[]>(`/products${query ? `?${query}` : ""}`);
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
    const raw = await request<ApiProduct | null>(`/products/${slug}`);
    return raw ? mapProduct(raw) : null;
  } catch {
    return getProduct(slug) ?? null;
  }
}

export async function fetchRelatedProducts(
  product: Pick<Product, "slug" | "category">,
  limit = 4
): Promise<Product[]> {
  // Começa pela categoria, mas completa com o resto do catálogo: uma
  // categoria de quatro peças devolveria três e deixaria a fileira de quatro
  // colunas com um buraco.
  try {
    const all = await fetchProducts();
    const others = all.filter((item) => item.slug !== product.slug);
    const sameCategory = others.filter(
      (item) => item.category === product.category
    );
    const rest = others.filter((item) => item.category !== product.category);
    return [...sameCategory, ...rest].slice(0, limit);
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
