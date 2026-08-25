"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product, ProductVariant } from "@/types";
import { ProductCard } from "@/components/product/product-card";
import { cn, formatPrice } from "@/lib/utils";

type SortOption = "relevance" | "price-asc" | "price-desc" | "newest";

const COLOR_NAMES: Record<string, string> = {
  "#111111": "Preto",
  "#EDEDE8": "Branco",
  "#C75B2A": "Laranja",
  "#444444": "Grafite",
  "#888888": "Cinza",
  "#2D6A4F": "Musgo",
};

function productSize(product: Product): "P" | "M" | "G" {
  const height = product.dimensions?.height ?? 200;
  if (height < 150) return "P";
  if (height <= 250) return "M";
  return "G";
}

interface CatalogViewProps {
  products: Product[];
  title: string;
  description?: string;
}

export function CatalogView({ products, title, description }: CatalogViewProps) {
  const [sort, setSort] = useState<SortOption>("relevance");
  const [maxPrice, setMaxPrice] = useState(35000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [customOnly, setCustomOnly] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const availableColors = useMemo(() => {
    const hexes = new Set<string>();
    products.forEach((product) =>
      (product.variants ?? []).forEach((variant: ProductVariant) => {
        if (variant.colorHex) hexes.add(variant.colorHex);
      })
    );
    return [...hexes];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const price = product.price || 0;
      if (price > maxPrice && !product.isCustom) return false;
      if (inStockOnly && (product.stock === 0 || !product.isAvailable))
        return false;
      if (customOnly && !product.isCustom) return false;
      if (sizes.length && !sizes.includes(productSize(product))) return false;
      if (
        colors.length &&
        !(product.variants ?? []).some(
          (variant) => variant.colorHex && colors.includes(variant.colorHex)
        )
      )
        return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return (
            Number(b.isFeatured) - Number(a.isFeatured) ||
            (b.rating ?? 0) - (a.rating ?? 0)
          );
      }
    });
    return result;
  }, [products, sort, maxPrice, inStockOnly, customOnly, sizes, colors]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const clearAll = () => {
    setMaxPrice(35000);
    setInStockOnly(false);
    setCustomOnly(false);
    setSizes([]);
    setColors([]);
  };

  const activeFilterCount =
    (maxPrice < 35000 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (customOnly ? 1 : 0) +
    sizes.length +
    colors.length;

  const filtersPanel = (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-caption uppercase text-secondary">
          Faixa de preço
        </legend>
        <input
          type="range"
          min={10000}
          max={35000}
          step={1000}
          value={maxPrice}
          onChange={(event) => setMaxPrice(Number(event.target.value))}
          aria-label="Preço máximo"
          className="mt-4 w-full accent-[var(--color-accent)]"
        />
        <p className="mt-1 text-body-small tabular-nums text-tertiary">
          até {formatPrice(maxPrice)}
        </p>
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-body-small">Somente disponíveis</span>
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(event) => setInStockOnly(event.target.checked)}
          className="size-4 accent-[var(--color-accent)]"
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-body-small">Personalizados</span>
        <input
          type="checkbox"
          checked={customOnly}
          onChange={(event) => setCustomOnly(event.target.checked)}
          className="size-4 accent-[var(--color-accent)]"
        />
      </label>

      <fieldset>
        <legend className="text-caption uppercase text-secondary">Tamanho</legend>
        <div className="mt-3 flex gap-2">
          {["P", "M", "G"].map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={sizes.includes(size)}
              onClick={() => setSizes(toggle(sizes, size))}
              className={cn(
                "flex size-10 items-center justify-center rounded-md border text-body-small transition-colors",
                sizes.includes(size)
                  ? "border-accent bg-accent text-white"
                  : "border-strong hover:border-primary/40"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>

      {availableColors.length > 0 && (
        <fieldset>
          <legend className="text-caption uppercase text-secondary">Cor</legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {availableColors.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={COLOR_NAMES[hex] ?? hex}
                aria-pressed={colors.includes(hex)}
                onClick={() => setColors(toggle(colors, hex))}
                className={cn(
                  "size-7 rounded-full border border-strong transition-transform hover:scale-110",
                  colors.includes(hex) &&
                    "ring-2 ring-accent ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </fieldset>
      )}

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 text-body-small text-accent underline-offset-4 hover:underline"
        >
          <X size={14} />
          Limpar filtros ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-12 lg:grid-cols-[240px_1fr]">
      <aside
        className={cn(
          "h-fit lg:sticky lg:top-28",
          filtersOpen
            ? "rounded-lg border p-6"
            : "hidden lg:block lg:border-none lg:p-0"
        )}
        aria-label="Filtros do catálogo"
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="font-display text-heading-3">Filtros</p>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            aria-label="Fechar filtros"
            className="flex size-9 items-center justify-center rounded-md text-secondary"
          >
            <X size={18} />
          </button>
        </div>
        {filtersPanel}
      </aside>

      <section aria-label={`Produtos — ${title}`}>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-heading-1 tracking-tight">{title}</h1>
            {description && (
              <p className="mt-2 max-w-xl text-body-large text-secondary">
                {description}
              </p>
            )}
            <p className="mt-3 text-caption uppercase text-tertiary" aria-live="polite">
              {filtered.length}{" "}
              {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-strong px-4 text-body-small lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <label className="sr-only" htmlFor="catalog-sort">
              Ordenar por
            </label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="h-11 rounded-md border border-strong bg-surface px-3 text-body-small focus:border-accent focus:outline-none"
            >
              <option value="relevance">Relevância</option>
              <option value="newest">Novidade</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-strong py-20 text-center">
            <p className="font-display text-heading-3">Nada por aqui</p>
            <p className="mx-auto mt-2 max-w-sm text-body-small text-secondary">
              Nenhum produto corresponde aos filtros selecionados. Ajuste os
              critérios para ver mais peças.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-6 inline-flex h-11 items-center rounded-md bg-accent px-6 text-body-small font-medium text-white transition-colors hover:bg-accent-dark"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="medium"
                revealDelay={(index % 9) * 70}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
