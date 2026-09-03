"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { CATEGORIES } from "@/data/categories";
import { POPULAR_SEARCHES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

export function SearchOverlay() {
  const router = useRouter();
  const searchOpen = useUIStore((state) => state.searchOpen);
  const openSearch = useUIStore((state) => state.openSearch);
  const closeSearch = useUIStore((state) => state.closeSearch);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        closeSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch, closeSearch]);

  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    if (searchOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(term)}&limit=6`)
        .then((response) => (response.ok ? response.json() : []))
        .then((rows: Product[]) => setResults(rows))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const submit = () => {
    if (!query.trim()) return;
    closeSearch();
    router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Busca"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[85] overflow-y-auto bg-background"
        >
          <div className="shell py-8">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Fechar busca"
                className="flex size-11 items-center justify-center border border-primary text-secondary transition-colors hover:bg-primary hover:text-background"
              >
                <X size={24} />
              </button>
            </div>

            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05, ease: [0, 0, 0.2, 1] }}
              className="mx-auto mt-4 max-w-2xl"
            >
              <div className="flex items-center gap-4 border-b-2 border-primary pb-3">
                <Search size={26} className="shrink-0 text-tertiary" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && submit()}
                  placeholder="Buscar peças, coleções…"
                  aria-label="Buscar produtos"
                  className="w-full bg-transparent font-display text-heading-2 tracking-tight outline-none placeholder:text-quaternary"
                />
              </div>

              {!query && (
                <div className="mt-8">
                  <p className="text-caption uppercase text-tertiary">
                    Buscas populares
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                  <p className="mt-10 text-caption uppercase text-tertiary">
                    Coleções
                  </p>
                  <ul className="mt-3 space-y-1">
                    {CATEGORIES.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/colecoes/${category.slug}`}
                          onClick={closeSearch}
                          className="group flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-surface-muted"
                        >
                          <span className="text-body-small font-medium">
                            {category.name}
                          </span>
                          <ArrowUpRight
                            size={15}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {query && (
                <div className="mt-6">
                  {results.length === 0 ? (
                    <p className="py-10 text-center text-body-large text-secondary">
                      Nenhum resultado para{" "}
                      <span className="font-medium text-primary">“{query}”</span>.
                      <br />
                      <span className="text-body-small">
                        Tente “vaso”, “dragão” ou explore as coleções.
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="text-caption uppercase text-tertiary">
                        {results.length}{" "}
                        {results.length === 1 ? "resultado" : "resultados"}
                      </p>
                      <ul className="mt-3 divide-y divide-border-subtle">
                        {results.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/produto/${product.slug}`}
                              onClick={closeSearch}
                              className="group flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-surface-muted"
                            >
                              <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-muted">
                                <Image
                                  src={product.images[0]?.url ?? ""}
                                  alt=""
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-body-small font-medium group-hover:text-accent">
                                  {product.name}
                                </p>
                                <p className="text-caption uppercase text-tertiary">
                                  {product.category}
                                </p>
                              </div>
                              <p className="text-body-small tabular-nums text-secondary">
                                {formatPrice(product.price)}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
