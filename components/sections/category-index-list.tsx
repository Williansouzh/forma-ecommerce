"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/data/categories";
import { VIEWPORT_ONCE } from "@/lib/animations";

export function CategoryIndexList({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 gap-px bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <motion.div
          key={category.slug}
          initial={{ opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.25, delay: index * 0.04 }}
          className="bg-background"
        >
          <Link
            href={`/colecoes/${category.slug}`}
            className="group relative flex h-full min-h-[320px] flex-col justify-between gap-8 overflow-hidden bg-surface p-8 transition-colors duration-500 hover:bg-surface-muted md:p-10"
          >
            <div aria-hidden className="absolute right-4 top-4 h-28 w-28 opacity-70 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>

            <div className="relative z-10 flex items-start justify-end">
              <ArrowUpRight
                size={20}
                strokeWidth={1}
                aria-hidden
                className="-translate-x-2 translate-y-2 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
              />
            </div>

            <div className="relative z-10">
              <h3 className="max-w-[13rem] font-display text-heading-2 leading-snug">
                {category.name}
              </h3>
              <p className="mt-3 max-w-sm text-body-small text-secondary">
                {category.description}
              </p>
              <p className="mt-5 text-body-small italic text-tertiary">
                {category.slug === "personalizados"
                  ? "sob consulta"
                  : `${category.productCount} peças`}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
