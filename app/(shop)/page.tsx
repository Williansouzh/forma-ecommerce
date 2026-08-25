import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { CategoryIndex } from "@/components/sections/category-grid";
import { CustomOrderSection } from "@/components/sections/custom-order-section";
import { ProcessSection } from "@/components/sections/process-section";
import { CTASection } from "@/components/sections/cta-section";
import { organizationJsonLd, websiteJsonLd } from "@/lib/schema-org";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FORMA. — Objetos feitos para existir | Impressão 3D Premium",
  description:
    "Colecionáveis, decoração e peças personalizadas produzidas por impressão 3D sob demanda. Precisão de estúdio, acabamento artesanal.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
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
      <CategoryIndex />
      <CustomOrderSection />
      <ProcessSection />
      <CTASection />
    </>
  );
}
