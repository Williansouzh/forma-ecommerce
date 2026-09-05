import type { Metadata } from "next";
import { fetchProducts } from "@/lib/api";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { CatalogView } from "@/components/sections/catalog-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coleção completa",
  description:
    "Todas as peças do ateliê: decoração, geek, presentes, utilidades e sob medida. Cada uma impressa depois do pedido.",
  alternates: { canonical: "/colecoes" },
};

export default async function CollectionsPage() {
  const products = await fetchProducts();

  return (
    <div className="shell pb-24 pt-[clamp(30px,6vh,70px)]">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Coleção" }]} />
      <CatalogView products={products} title="Coleção completa" />
    </div>
  );
}
