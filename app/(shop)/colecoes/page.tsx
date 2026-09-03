import type { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { fetchProducts } from "@/lib/api";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { CategoryIndexList } from "@/components/sections/category-index-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coleções",
  description:
    "Explore todas as coleções FORMA.: chaveiros, presentes, bonecos, decoração, geek, miniaturas e personalizados.",
  alternates: { canonical: "/colecoes" },
};

export default async function CollectionsPage() {
  const products = await fetchProducts();

  return (
    <div className="shell pb-24 pt-28 md:pt-36">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Coleções" }]} />

      <header className="max-w-2xl">
        <p className="text-caption uppercase text-tertiary">Catálogo completo</p>
        <h1 className="mt-2 font-display text-display-2 tracking-tight">
          Todas as coleções
        </h1>
        <p className="mt-4 text-body-large text-secondary">
          {products.length} peças em produção contínua, de chaveiros
          personalizados a objetos de decoração, cada uma verificada à mão antes
          do envio.
        </p>
      </header>

      <div className="mt-14">
        <CategoryIndexList categories={CATEGORIES} />
      </div>
    </div>
  );
}
