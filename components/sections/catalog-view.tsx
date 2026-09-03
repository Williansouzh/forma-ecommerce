"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product, ProductVariant } from "@/types";
import { ProductCard } from "@/components/product/product-card";
import { cn, formatPrice } from "@/lib/utils";

type SortOption = "relevance" | "price-asc" | "price-desc" | "newest";

const COLOR_NAMES: Record<string, string> = {
  "#111111": "Preto",
  "#EDEDE8": "Areia",
  "#C75B2A": "Terracota",
  "#444444": "Grafite",
  "#888888": "Pedra",
  "#2D6A4F": "Musgo",
};

/** Alturas alternadas: grid uniforme lê como catálogo, irregular lê como vitrine. */
const CARD_RHYTHM = ["tall", "medium", "wide", "medium", "tall", "wide"] as const;

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
  const [materials, setMaterials] = useState<string[]>([]);
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

  const availableMaterials = useMemo(() => {
    const names = new Set<string>();
    products.forEach((product) => {
      if (product.material) names.add(product.material);
    });
    return [...names];
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
      if (materials.length && !product.material) return false;
      if (
        materials.length &&
        product.material &&
        !materials.includes(product.material)
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
  }, [products, sort, maxPrice, inStockOnly, customOnly, sizes, colors, materials]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const clearAll = () => {
    setMaxPrice(35000);
    setInStockOnly(false);
    setCustomOnly(false);
    setSizes([]);
    setColors([]);
    setMaterials([]);
  };

  const activeFilterCount =
    (maxPrice < 35000 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (customOnly ? 1 : 0) +
    sizes.length +
    colors.length +
    materials.length;

  const filtersPanel = (
    <div className="space-y-8">
      <fieldset>
        <legend className="label text-tertiary">
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
        <legend className="label text-tertiary">Tamanho</legend>
        <div className="mt-3 flex gap-2">
          {["P", "M", "G"].map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={sizes.includes(size)}
              onClick={() => setSizes(toggle(sizes, size))}
              className={cn(
                "flex size-10 items-center justify-center border text-body-small transition-colors duration-300",
                sizes.includes(size)
                  ? "border-primary bg-primary text-background"
                  : "border-border-strong hover:border-primary"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>

      {availableColors.length > 0 && (
        <fieldset>
          <legend className="label text-tertiary">Cor</legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {availableColors.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={COLOR_NAMES[hex] ?? hex}
                aria-pressed={colors.includes(hex)}
                onClick={() => setColors(toggle(colors, hex))}
                className={cn(
                  "size-7 rounded-full outline outline-1 transition-all duration-300",
                  colors.includes(hex)
                    ? "outline-primary outline-offset-[5px]"
                    : "outline-border-strong hover:outline-offset-[3px]"
                )}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </fieldset>
      )}

      {availableMaterials.length > 0 && (
        <fieldset>
          <legend className="label text-tertiary">
            Material
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableMaterials.map((material) => (
              <button
                key={material}
                type="button"
                aria-pressed={materials.includes(material)}
                onClick={() => setMaterials(toggle(materials, material))}
                className={cn(
                  "border px-3 py-2 text-micro uppercase transition-colors duration-300",
                  materials.includes(material)
                    ? "border-primary bg-primary text-background"
                    : "border-border-strong hover:border-primary"
                )}
              >
                {material}
              </button>
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
          <X size={14} strokeWidth={1} />
          Limpar filtros ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
      <aside
        className={cn(
          "h-fit lg:sticky lg:top-28",
          filtersOpen
            ? "bg-surface p-8"
            : "hidden lg:block lg:border-r lg:border-border-subtle lg:pr-8"
        )}
        aria-label="Filtros do catálogo"
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="font-display text-heading-3">Filtros</p>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            aria-label="Fechar filtros"
            className="flex size-9 items-center justify-center border border-border-subtle text-secondary"
          >
            <X size={18} strokeWidth={1} />
          </button>
        </div>
        {filtersPanel}
      </aside>

      <section aria-label={`Produtos — ${title}`}>
        <header className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-heading-1">{title}</h1>
            {description && (
              <p className="mt-2 max-w-xl text-body-large text-secondary">
                {description}
              </p>
            )}
            <p className="mt-6 text-body-small italic text-tertiary" aria-live="polite">
              {filtered.length === 1
                ? "uma peça"
                : `${filtered.length} peças`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              className="inline-flex h-11 items-center gap-2 border border-border-strong px-5 text-body-small lg:hidden"
            >
              <SlidersHorizontal size={16} strokeWidth={1} />
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <label className="sr-only" htmlFor="catalog-sort">
              Ordenar por
            </label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="h-11 border border-border-strong bg-surface px-3 text-body-small focus:border-primary focus:outline-none"
            >
              <option value="relevance">Relevância</option>
              <option value="newest">Novidade</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="border-t border-border-strong py-24">
            <p className="font-display text-heading-2">
              Nada aqui com esses filtros
            </p>
            <p className="mt-3 max-w-sm text-body text-secondary">
              Tenta afrouxar um critério — ou dá uma olhada em tudo que está
              pronto.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="label mt-8 inline-block border border-primary px-8 py-4 text-primary transition-colors duration-300 hover:bg-primary hover:text-background"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-12 gap-y-20 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={CARD_RHYTHM[index % CARD_RHYTHM.length]}
                revealDelay={(index % 9) * 0.07}
                className={index % 3 === 1 ? "xl:mt-12" : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
