import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory } from "@/data/categories";
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
  return {
    title: `${category.name} — Coleções`,
    description: category.description,
    alternates: { canonical: `/colecoes/${category.slug}` },
    openGraph: {
      title: `${category.name} | FORMA.`,
      description: category.description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const products = await fetchProducts({ category: category.slug });

  return (
    <div className="shell pb-24 pt-28 md:pt-36">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Início", item: "/" },
              { name: "Coleções", item: "/colecoes" },
              { name: category.name, item: `/colecoes/${category.slug}` },
            ])
          ),
        }}
      />
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Coleções", href: "/colecoes" },
          { label: category.name },
        ]}
      />
      <CatalogView
        products={products}
        title={category.name}
        description={category.description}
      />
    </div>
  );
}
