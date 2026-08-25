import Link from "next/link";
import { getFeaturedProducts } from "@/data/products";
import { fetchProducts } from "@/lib/api";
import { ProductGrid, ProductGridItem } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { cn } from "@/lib/utils";

const layout = [
  { variant: "large" as const, className: "md:col-span-7" },
  { variant: "large" as const, className: "md:col-span-5" },
  { variant: "wide" as const, className: "md:col-span-4" },
  { variant: "wide" as const, className: "md:col-span-4" },
  { variant: "wide" as const, className: "md:col-span-4" },
  { variant: "horizontal" as const, className: "sm:col-span-2 md:col-span-12" },
];

export async function FeaturedProducts() {
  let products = await fetchProducts({ featured: true, limit: 6 });
  if (products.length === 0) products = getFeaturedProducts().slice(0, 6);

  return (
    <section aria-labelledby="destaques-titulo" className="shell py-24 md:py-32">
      <div>
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-3 text-caption uppercase text-tertiary">
              <span className="text-accent">01</span>
              <span aria-hidden className="h-px w-8 bg-quaternary" />
              Seleção do estúdio
            </p>
            <h2
              id="destaques-titulo"
              className="mt-3 font-display text-display-2 tracking-tight"
            >
              Em destaque
            </h2>
          </div>
          <Link
            href="/colecoes"
            className="nav-link hidden shrink-0 pb-1 text-body-small font-medium text-accent md:block"
          >
            Ver catálogo completo
          </Link>
        </div>

        <ProductGrid>
          {products.map((product, index) => {
            const config = layout[index % layout.length];
            return (
              <ProductGridItem
                key={product.id}
                className={cn(config.className)}
              >
                <ProductCard
                  product={product}
                  variant={config.variant}
                  revealDelay={(index % 6) * 90}
                />
              </ProductGridItem>
            );
          })}
        </ProductGrid>
      </div>
    </section>
  );
}
