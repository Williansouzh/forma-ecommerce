"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { CATEGORIES, type CategoryColor } from "@/data/categories";
import { ProductCard } from "@/components/product/product-card";
import { inCatalogOrder } from "@/lib/catalog-order";

type SortOption = "destaque" | "menor" | "maior" | "novo";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "destaque", label: "Ordenar: destaque" },
  { value: "menor", label: "Menor preço" },
  { value: "maior", label: "Maior preço" },
  { value: "novo", label: "Novidades" },
];

/** Data de criação em número, tolerante a string, Date e campo ausente. */
function createdAtMs(product: Product): number {
  const value = new Date(product.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
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
        // Era `list.reverse()`, que só coincide com "mais novo primeiro" se o
        // catálogo estiver perfeitamente ordenado por data — o que ninguém
        // garante depois de editar um produto pelo painel.
        return list.sort((a, b) => createdAtMs(b) - createdAtMs(a));
      default:
        return inCatalogOrder(list);
    }
  }, [products, sort]);

  const chips: {
    slug: string;
    name: string;
    href: string;
    color?: CategoryColor;
  }[] = [
    { slug: "todos", name: "Tudo", href: "/colecoes" },
    ...CATEGORIES.map((category) => ({
      slug: category.slug,
      name: category.name,
      href: `/colecoes/${category.slug}`,
      color: category.color,
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border-strong pb-6 pt-5">
        <h1 className="font-display text-display-2">{title}</h1>
        <span className="text-body-small text-tertiary">
          <span className="data">{products.length}</span>
          {products.length === 1
            ? " peça · impressa depois do pedido"
            : " peças · impressas depois do pedido"}
        </span>
      </div>

      {/*
        Os chips são links, não estado local: cada categoria tem URL própria,
        que dá para compartilhar e vem renderizada do servidor.

        Ficam em faixa rolável e em linha própria. Com seis categorias eles
        disputavam a mesma linha com o seletor de ordenação e quebravam feio
        entre 1024 e 1280px.
      */}
      {showFilters && (
        <div className="edge-fade no-scrollbar -mx-4 mt-6 overflow-x-auto px-4">
          <div className="flex w-max items-center gap-2.5">
            {chips.map((chip) => {
              const active = chip.slug === activeSlug;
              return (
                <Link
                  key={chip.slug}
                  href={chip.href}
                  aria-current={active ? "page" : undefined}
                  style={
                    chip.color
                      ? ({
                          "--cat-light": chip.color.light,
                          "--cat-dark": chip.color.dark,
                        } as React.CSSProperties)
                      : undefined
                  }
                  className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border px-4 text-[14px] font-medium transition-colors duration-150 ${
                    active
                      ? "border-primary bg-primary text-background"
                      : "border-border-strong text-primary hover:border-primary"
                  }`}
                >
                  {chip.color && (
                    <span
                      aria-hidden
                      className={`cat-bg size-2 rounded-full ${
                        active ? "opacity-100" : "opacity-80"
                      }`}
                    />
                  )}
                  {chip.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-[clamp(28px,4vw,44px)] mt-4 flex items-center justify-between gap-4">
        <span className="text-body-small text-tertiary">
          <span className="data">{items.length}</span>
          {items.length === 1 ? " resultado" : " resultados"}
        </span>

        <label>
          <span className="sr-only">Ordenar</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="min-h-11 cursor-pointer rounded-md border border-border-strong bg-transparent px-3 text-[14px] text-primary"
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
        /*
          Duas colunas já no celular: uma coluna mostrava um produto por tela e
          fazia o catálogo parecer vazio. O selo de categoria só aparece na
          coleção completa, onde a grade é de fato misturada.
        */
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="grid"
              showCategory={activeSlug === "todos"}
            />
          ))}
        </div>
      )}
    </>
  );
}
