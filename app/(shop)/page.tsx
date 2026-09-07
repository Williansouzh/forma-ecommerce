import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { MarqueeStrip } from "@/components/sections/marquee-strip";
import { LookbookSection } from "@/components/sections/lookbook-section";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { CategoryIndex } from "@/components/sections/category-grid";
import { CustomOrderSection } from "@/components/sections/custom-order-section";
import { AtelierQuote } from "@/components/sections/atelier-quote";
import { ProcessSection } from "@/components/sections/process-section";
import { CTASection } from "@/components/sections/cta-section";
import { organizationJsonLd, websiteJsonLd } from "@/lib/schema-org";
import { withProductCounts } from "@/data/categories";
import { fetchProducts } from "@/lib/api";
import { getStoreSettings } from "@/lib/settings";
import { resolveHomeMedia } from "@/lib/home-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "c3dcriativ — Objetos pequenos para casa",
  description:
    "Decoração, chaveiros e presentes feitos em pequena escala, com textura aparente, cor quente e acabamento manual.",
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
        A ordem é a do handoff: vitrine, respiro, coleções, encomenda, oficina,
        lookbook e chamada. As seções numeradas (01–05) contam com essa
        sequência — trocar duas de lugar quebra a contagem visível na tela.
      */}
      <HeroSection image={media.hero} videoPoster={media.atelierHero} />
      <MarqueeStrip />
      <FeaturedProducts />
      <AtelierQuote />
      <CategoryIndex categories={withProductCounts(products)} />
      <CustomOrderSection />
      <ProcessSection videoPoster={media.atelierProcess} />
      <LookbookSection photos={media.lookbook} />
      <CTASection />
    </>
  );
}
