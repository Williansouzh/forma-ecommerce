import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { PRODUCTS } from "@/data/products";
import { CATEGORIES } from "@/data/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/colecoes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/personalizados`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: `${SITE_URL}/colecoes/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((product) => ({
    url: `${SITE_URL}/produto/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
