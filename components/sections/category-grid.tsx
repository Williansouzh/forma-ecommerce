import { CATEGORIES, type Category } from "@/data/categories";
import { CategoryIndexList } from "@/components/sections/category-index-list";
import { SectionHeading } from "@/components/sections/section-heading";

/** As contagens vêm do servidor; sem elas, mostra as categorias sem número. */
export function CategoryIndex({
  categories = CATEGORIES,
}: {
  categories?: Category[];
}) {
  return (
    <section aria-labelledby="categorias-titulo" className="shell">
      <SectionHeading number="02" id="categorias-titulo" title="Coleções" />
      <div className="mt-1.5">
        <CategoryIndexList categories={categories} />
      </div>
    </section>
  );
}
