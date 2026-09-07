"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/types/product";
import {
  storefrontCategories,
  type Category,
  type CategoryColor,
} from "@/data/categories";
import { ProductCard } from "@/components/product/product-card";
import {
  DEADLINES,
  DEFAULT_FILTERS,
  PRICES,
  SORTS,
  activeFilterCount,
  applyCatalogFilters,
  type DeadlineOption,
  type PriceOption,
  type SortOption,
} from "@/lib/catalog-filters";

/** Um controle nativo — teclado, leitor de tela e roda do mouse já funcionam. */
function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  block,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Largura total dentro da gaveta; automático na barra do desktop. */
  block?: boolean;
}) {
  return (
    <label className={block ? "block" : undefined}>
      <span className={block ? "label text-tertiary" : "sr-only"}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={label}
        className={`min-h-11 cursor-pointer rounded-md border border-border-strong bg-transparent px-3 text-[14px] text-primary ${
          block ? "mt-2 w-full" : ""
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CatalogView({
  products,
  title,
  categories = [],
  activeSlug = "todos",
  showFilters = true,
}: {
  products: Product[];
  title: string;
  /**
   * Contadas sobre o catálogo **inteiro**, não sobre `products`. Numa página
   * de categoria `products` já vem filtrado — contar ali daria zero para todas
   * as outras famílias e esconderia todos os chips menos o aberto.
   */
  categories?: Category[];
  /** Slug da categoria aberta, ou "todos" na coleção completa. */
  activeSlug?: string;
  /** A busca não mostra os chips: clicar num deles abandonaria o resultado. */
  showFilters?: boolean;
}) {
  const [sort, setSort] = useState<SortOption>(DEFAULT_FILTERS.sort);
  const [price, setPrice] = useState<PriceOption>(DEFAULT_FILTERS.price);
  const [deadline, setDeadline] = useState<DeadlineOption>(
    DEFAULT_FILTERS.deadline
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Esc fecha, e o foco entra na gaveta ao abrir — senão o teclado continua
  // navegando a grade atrás dela.
  useEffect(() => {
    if (!sheetOpen) return;
    sheetRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const items = useMemo(
    () => applyCatalogFilters(products, { price, deadline, sort }),
    [products, price, deadline, sort]
  );

  const activeCount = activeFilterCount({ price, deadline, sort });

  const clear = () => {
    setPrice(DEFAULT_FILTERS.price);
    setDeadline(DEFAULT_FILTERS.deadline);
  };

  const chips: {
    slug: string;
    name: string;
    href: string;
    color?: CategoryColor;
  }[] = [
    { slug: "todos", name: "Tudo", href: "/colecoes" },
    // Os chips seguem a mesma regra da vitrine: categoria sem peça não vira
    // um chip que leva a uma coleção vazia.
    ...storefrontCategories(categories).map((category) => ({
      slug: category.slug,
      name: category.name,
      href: `/colecoes/${category.slug}`,
      color: category.color,
    })),
  ];

  const controls = (block?: boolean) => (
    <>
      <Select
        label="Preço"
        value={price}
        onChange={setPrice}
        options={PRICES}
        block={block}
      />
      <Select
        label="Prazo"
        value={deadline}
        onChange={setDeadline}
        options={DEADLINES}
        block={block}
      />
      <Select
        label="Ordenar por"
        value={sort}
        onChange={setSort}
        options={SORTS}
        block={block}
      />
    </>
  );

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
        <span className="text-body-small text-tertiary" aria-live="polite">
          <span className="data">{items.length}</span>
          {items.length === 1 ? " resultado" : " resultados"}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              className="nav-link ml-3 font-medium text-primary"
            >
              Limpar filtros
            </button>
          )}
        </span>

        {/* No celular os três seletores lado a lado não cabem: viram uma
            gaveta, com a contagem de filtros ativos no próprio botão. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-4 text-[14px] font-medium text-primary sm:hidden"
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden />
          Filtrar e ordenar
          {activeCount > 0 && (
            <span className="data rounded-md bg-primary px-1.5 text-[12px] text-background">
              {activeCount}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-2.5 sm:flex">{controls()}</div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-primary/40"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filtrar e ordenar"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-lg bg-surface p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-heading-3">Filtrar e ordenar</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fechar"
                className="grid size-11 place-items-center text-primary"
              >
                <X size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">{controls(true)}</div>

            <div className="mt-6 flex gap-3">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="min-h-12 flex-1 rounded-md border border-border-strong text-[15px] font-medium text-primary"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="min-h-12 flex-[2] rounded-md bg-primary text-[15px] font-semibold text-background"
              >
                Ver {items.length} {items.length === 1 ? "peça" : "peças"}
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16">
          <p className="text-body-large text-secondary">
            {activeCount > 0
              ? "Nenhuma peça nesses filtros."
              : "Nada nesta coleção ainda. As peças sob medida saem por encomenda — é só mandar a ideia."}
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              className="nav-link mt-3 font-medium text-primary"
            >
              Limpar filtros
            </button>
          )}
        </div>
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
