import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { LookbookSection } from "@/components/sections/lookbook-section";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { CategoryIndex } from "@/components/sections/category-grid";
import { CustomOrderSection } from "@/components/sections/custom-order-section";
import { ProcessSection } from "@/components/sections/process-section";
import { FaqSection } from "@/components/sections/faq-section";
import { CTASection } from "@/components/sections/cta-section";
import { organizationJsonLd, websiteJsonLd } from "@/lib/schema-org";
import { withProductCounts } from "@/data/categories";
import { fetchProducts } from "@/lib/api";
import { getStoreSettings } from "@/lib/settings";
import { resolveHomeMedia } from "@/lib/home-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "c3dcriativ — Objetos impressos em 3D, um por vez",
  description:
    "Vasos, articulados, chaveiros e presentes impressos em 3D em Campina Grande. Você escolhe a cor; a peça é impressa depois do pedido.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    fetchProducts(),
    getStoreSettings(),
  ]);
  // `getStoreSettings` nunca lança: com a API fora, `homeMedia` vem indefinido
  // e a vitrine mostra as imagens embutidas, como sempre mostrou.
  const media = resolveHomeMedia(settings.homeMedia);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]),
        }}
      />
      {/*
        A ordem espelha a jornada de compra, e não a ordem em que a marca
        gostaria de se apresentar.

        Descoberta (vitrine, coleções) → consideração (peças, sob medida) →
        confiança (oficina, casa de quem comprou, dúvidas) → ação (fecho).

        Antes eram nove seções, cinco delas sobre o ateliê e duas sobre
        produto. Saíram a faixa de palavras rolando — que gastava a posição
        mais valiosa da página depois do hero repetindo os rótulos do menu — e
        a citação do ateliê, que era a terceira seção institucional seguida.
      */}
      <HeroSection image={media.hero} videoPoster={media.atelierHero} />
      <CategoryIndex categories={withProductCounts(products)} />
      <FeaturedProducts />
      <CustomOrderSection />
      <ProcessSection videoPoster={media.atelierProcess} />
      <LookbookSection photos={media.lookbook} />
      <FaqSection />
      <CTASection />
    </>
  );
}
