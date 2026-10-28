import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { fetchProducts } from "@/lib/api";
import { CATEGORIES } from "@/data/categories";

/**
 * As peças saem da API, não de `data/products.ts`: o sitemap anunciava ao
 * Google as nove peças de demonstração, que não existem no banco e abririam
 * como 404.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/colecoes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/personalizados`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/atelier`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/sobre`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/politicas`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: `${SITE_URL}/colecoes/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const products = await fetchProducts();
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/produto/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
