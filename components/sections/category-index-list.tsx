"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/data/categories";

/**
 * Coleções como índice, não como grade de cartões.
 *
 * São cinco linhas — cabem numa lista lida de cima a baixo, e a lista deixa o
 * nome da coleção grande o bastante para ser o assunto. A foto à direita
 * acompanha o item sob o cursor e fica presa na rolagem; no toque não há
 * hover, então ela simplesmente mostra a primeira coleção.
 */
export function CategoryIndexList({ categories }: { categories: Category[] }) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const active =
    categories.find((category) => category.slug === activeSlug) ?? categories[0];

  if (!active) return null;

  return (
    <div className="flex flex-wrap gap-[clamp(24px,4vw,64px)]">
      <div className="min-w-[280px] flex-[1_1_min(100%,620px)]">
        {categories.map((category, index) => (
          <Link
            key={category.slug}
            href={`/colecoes/${category.slug}`}
            onMouseEnter={() => setActiveSlug(category.slug)}
            onFocus={() => setActiveSlug(category.slug)}
            className="group flex items-center gap-[clamp(14px,3vw,34px)] border-b border-border-subtle px-1 py-[clamp(20px,3vw,34px)] transition-[padding,background-color] duration-[400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-accent/5 hover:pl-[18px]"
          >
            <span className="text-micro font-bold tabular-nums text-quaternary">
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="flex-1 font-display text-[clamp(26px,4vw,50px)] font-light leading-none tracking-[-0.02em]">
              {category.name}
            </span>

            <span className="whitespace-nowrap text-body-small tabular-nums text-tertiary">
              {/* Sob medida não tem catálogo fechado: contar peças ali mentiria. */}
              {category.slug === "personalizados"
                ? "∞"
                : `${category.productCount} ${
                    category.productCount === 1 ? "peça" : "peças"
                  }`}
            </span>

            <ArrowRight
              size={18}
              strokeWidth={1}
              aria-hidden
              className="shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        ))}
      </div>

      <div
        aria-hidden
        className="hidden min-w-[260px] flex-[1_1_min(100%,340px)] self-start pt-[clamp(20px,3vw,34px)] lg:sticky lg:top-28 lg:block"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
          <Image
            key={active.slug}
            src={active.image}
            alt=""
            fill
            sizes="400px"
            className="animate-fade-in object-cover saturate-[0.94]"
          />
        </div>
        <p className="mt-4 text-body-small text-secondary">{active.description}</p>
      </div>
    </div>
  );
}
