"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";
import { CATEGORIES } from "@/data/categories";
import { formatPrice } from "@/lib/utils";
import { availabilityNote } from "@/lib/product-availability";
import { inCatalogOrder } from "@/lib/catalog-order";

type SortOption = "destaque" | "menor" | "maior" | "novo";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "destaque", label: "Ordenar: destaque" },
  { value: "menor", label: "Menor preço" },
  { value: "maior", label: "Maior preço" },
  { value: "novo", label: "Novidades" },
];

/**
 * O card do catálogo é mais sóbrio que o da vitrine: foto, nome, preço e
 * prazo. Sem botão flutuante sobre a foto — quem está varrendo a grade quer
 * comparar peças, não comprar de dentro dela.
 */
function CatalogCard({ product }: { product: Product }) {
  const photo = product.images.find((image) => image.isPrimary) ?? product.images[0];
  const note = availabilityNote(product);

  return (
    <Link href={`/produto/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
        {photo && (
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover saturate-[0.94] transition-transform duration-[900ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.04]"
          />
        )}
        {product.badge && (
          <span className="absolute left-3 top-3 bg-background/[0.92] px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
            {product.badge}
          </span>
        )}
      </div>

      {/* A altura mínima alinha os preços entre cards de nome curto e longo. */}
      <div className="mt-[15px] flex min-h-12 items-baseline justify-between gap-3">
        <h3 className="font-display text-[20px] font-normal leading-tight">
          {product.name}
        </h3>
        <span className="whitespace-nowrap text-[15px] font-semibold tabular-nums">
          {formatPrice(product.price)}
        </span>
      </div>

      {note && <p className="mt-1 text-[13.5px] text-tertiary">{note}</p>}
    </Link>
  );
}

export function CatalogView({
  products,
  title,
  activeSlug = "todos",
  showFilters = true,
}: {
  products: Product[];
  title: string;
  /** Slug da categoria aberta, ou "todos" na coleção completa. */
  activeSlug?: string;
  /** A busca não mostra os chips: clicar num deles abandonaria o resultado. */
  showFilters?: boolean;
}) {
  const [sort, setSort] = useState<SortOption>("destaque");

  const items = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case "menor":
        return list.sort((a, b) => a.price - b.price);
      case "maior":
        return list.sort((a, b) => b.price - a.price);
      case "novo":
        return list.reverse();
      default:
        return inCatalogOrder(list);
    }
  }, [products, sort]);

  const chips = [
    { slug: "todos", name: "Tudo", href: "/colecoes" },
    ...CATEGORIES.map((category) => ({
      slug: category.slug,
      name: category.name,
      href: `/colecoes/${category.slug}`,
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border-strong pb-6 pt-5">
        <h1 className="font-display text-[clamp(34px,6vw,76px)] font-light leading-none tracking-[-0.03em]">
          {title}
        </h1>
        <span className="text-body-small tabular-nums text-tertiary">
          {products.length === 1
            ? "1 peça · impressa depois do pedido"
            : `${products.length} peças · impressas depois do pedido`}
        </span>
      </div>

      {/*
        Os chips são links, não estado local: cada categoria tem URL própria,
        que dá para compartilhar e vem renderizada do servidor. Visualmente é
        o mesmo controle do protótipo.
      */}
      <div className="mb-[clamp(30px,6vh,56px)] mt-[26px] flex flex-wrap items-center gap-2.5">
        {showFilters &&
          chips.map((chip) => {
            const active = chip.slug === activeSlug;
            return (
              <Link
                key={chip.slug}
                href={chip.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-md border px-4 text-[13px] font-medium transition-colors duration-[250ms] ${
                  active
                    ? "border-primary bg-primary text-background"
                    : "border-border-strong text-primary hover:border-accent"
                }`}
              >
                {chip.name}
              </Link>
            );
          })}

        <label className="ml-auto">
          <span className="sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="min-h-10 cursor-pointer rounded-md border border-border-strong bg-transparent px-3 text-[13px] text-primary"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <p className="py-20 text-body-large text-secondary">
          Nada nesta coleção ainda. As peças sob medida saem por encomenda —
          é só mandar a ideia.
        </p>
      ) : (
        <div className="grid gap-x-[clamp(18px,3vw,40px)] gap-y-[clamp(26px,4vw,56px)] [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
          {items.map((product) => (
            <CatalogCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
