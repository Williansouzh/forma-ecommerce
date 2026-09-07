import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProductBySlug, fetchRelatedProducts } from "@/lib/api";
import { getCategory } from "@/data/categories";
import Link from "next/link";
import Image from "next/image";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetails } from "@/components/product/product-details";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { formatPrice } from "@/lib/utils";
import { productJsonLd } from "@/lib/schema-org";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — feito sob demanda`,
    description: `${product.shortDescription} — Produção em impressão 3D com material, textura e prazo informados antes do envio.`,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      title: `${product.name} | c3dcriativ`,
      description: product.shortDescription,
      images: product.images.map((image) => ({ url: image.url })),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | c3dcriativ`,
      description: product.shortDescription,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const related = await fetchRelatedProducts(product);

  // `pb-32` no celular abre espaço para a barra fixa de compra não cobrir o
  // fim da página; no desktop ela não existe.
  return (
    <div className="shell pb-32 pt-[clamp(24px,5vh,56px)] sm:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />

      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Coleção", href: "/colecoes" },
          { label: product.name },
        ]}
      />

      <div className="mt-[clamp(24px,4vh,44px)] flex flex-wrap gap-[clamp(28px,5vw,76px)]">
        <ProductGallery product={product} />
        <ProductDetails product={product} categoryName={category?.name} />
      </div>

      {related.length > 0 && (
        <section
          aria-labelledby="relacionados-titulo"
          className="mt-[clamp(60px,12vh,140px)]"
        >
          <div className="flex items-baseline gap-4 border-b border-border-strong pb-5">
            <h2
              id="relacionados-titulo"
              className="font-display text-display-2"
            >
              Combina com
            </h2>
          </div>

          <div className="mt-[30px] grid gap-[clamp(20px,3vw,36px)] [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]">
            {related.slice(0, 4).map((item) => {
              const photo =
                item.images.find((image) => image.isPrimary) ?? item.images[0];
              return (
                <Link
                  key={item.id}
                  href={`/produto/${item.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-muted">
                    {photo && (
                      <Image
                        src={photo.url}
                        alt={photo.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 260px"
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0.6,0.3,1)] group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="mt-3 flex justify-between gap-2.5">
                    <span className="font-display text-[17px]">{item.name}</span>
                    <span className="text-[14px] font-semibold tabular-nums">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
