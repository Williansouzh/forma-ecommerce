import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { CategoryIndex } from "@/components/sections/category-grid";
import { CustomOrderSection } from "@/components/sections/custom-order-section";
import { ProcessSection } from "@/components/sections/process-section";
import { AtelierSection } from "@/components/sections/atelier-section";
import { CTASection } from "@/components/sections/cta-section";
import { organizationJsonLd, websiteJsonLd } from "@/lib/schema-org";
import { withProductCounts } from "@/data/categories";
import { fetchProducts } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "c3dcriativ — Objetos pequenos para casa",
  description:
    "Decoração, chaveiros e presentes feitos em pequena escala, com textura aparente, cor quente e acabamento manual.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const products = await fetchProducts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]),
        }}
      />
      <HeroSection />
      <FeaturedProducts />
      <CategoryIndex categories={withProductCounts(products)} />
      <CustomOrderSection />
      <ProcessSection />
      <AtelierSection />
      <CTASection />
    </>
  );
}
