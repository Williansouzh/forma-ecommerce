import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  canonicalCategory,
  getCategory,
  withProductCounts,
} from "@/data/categories";
import { fetchProducts } from "@/lib/api";
import { CatalogView } from "@/components/sections/catalog-view";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { breadcrumbJsonLd } from "@/lib/schema-org";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  /*
   * Família que ainda não tem peça existe para o painel, não para o Google:
   * ela não é linkada em lugar nenhum da loja, mas responde 200, e página de
   * categoria vazia indexada é conteúdo fino. Volta a ser indexável sozinha
   * assim que a primeira peça entra.
   */
  const products = await fetchProducts();
  const isEmpty = !products.some(
    (product) => canonicalCategory(product.category) === category.slug
  );

  return {
    title: `${category.name} — Coleção`,
    description: category.description,
    alternates: { canonical: `/colecoes/${category.slug}` },
    robots: isEmpty ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${category.name} | c3dcriativ`,
      description: category.description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  // O catálogo inteiro numa chamada só: a lista da página sai daqui filtrada,
  // e os chips precisam das contagens de **todas** as famílias, não só desta.
  const all = await fetchProducts();
  const products = all.filter(
    (product) => canonicalCategory(product.category) === category.slug
  );

  return (
    <div className="shell pb-24 pt-[clamp(30px,6vh,70px)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Início", item: "/" },
              { name: "Coleção", item: "/colecoes" },
              { name: category.name, item: `/colecoes/${category.slug}` },
            ])
          ),
        }}
      />
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Coleção", href: "/colecoes" },
          { label: category.name },
        ]}
      />
      <CatalogView
        products={products}
        title={category.name}
        categories={withProductCounts(all)}
        activeSlug={category.slug}
      />
    </div>
  );
}
