"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { CatalogView } from "@/components/sections/catalog-view";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { POPULAR_SEARCHES } from "@/lib/constants";
import type { Product } from "@/types/product";

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    setLoading(true);
    const timeout = setTimeout(() => {
      const qs = term
        ? `?q=${encodeURIComponent(term)}`
        : "?sort=newest&limit=100";
      fetch(`/api/products${qs}`)
        .then((response) => (response.ok ? response.json() : []))
        .then((rows: Product[]) => setResults(rows))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="shell pb-24 pt-28 md:pt-36">
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: "Busca" }]}
      />

      <div className="mx-auto max-w-2xl">
        <label htmlFor="page-search" className="sr-only">
          Buscar produtos
        </label>
        <div className="flex items-center gap-4 border-b-2 border-primary pb-3">
          <Search size={24} className="shrink-0 text-tertiary" />
          <input
            id="page-search"
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar peças, coleções…"
            className="w-full bg-transparent font-display text-heading-2 tracking-tight outline-none placeholder:text-quaternary"
          />
        </div>

        {!query && (
          <div className="mt-6 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="border border-border-strong px-4 py-2 text-body-small text-secondary transition-colors duration-300 hover:border-primary hover:text-primary"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-14">
        {query && loading ? (
          <p className="py-20 text-center text-body-large text-secondary">
            Buscando…
          </p>
        ) : query ? (
          results.length > 0 ? (
            <CatalogView
              products={results}
              title={`Resultados para “${query}”`}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-strong py-20 text-center">
              <p className="font-display text-heading-3">
                Nenhum resultado para “{query}”
              </p>
              <p className="mx-auto mt-2 max-w-sm text-body-small text-secondary">
                Tente outro termo ou explore as coleções completas.
              </p>
            </div>
          )
        ) : (
          <CatalogView products={results} title="Catálogo completo" />
        )}
      </div>
    </div>
  );
}
