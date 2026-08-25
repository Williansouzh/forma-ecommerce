"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/data/categories";
import { VIEWPORT_ONCE } from "@/lib/animations";

export function CategoryIndexList({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 border-l border-t sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <motion.div
          key={category.slug}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.3, delay: index * 0.08 }}
          className="border-b border-r"
        >
          <Link
            href={`/colecoes/${category.slug}`}
            className="group flex h-full min-h-[180px] flex-col justify-between gap-8 p-6 transition-colors duration-300 hover:bg-surface-muted md:p-8"
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-micro tabular-nums text-quaternary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <ArrowUpRight
                size={20}
                aria-hidden
                className="-translate-x-2 translate-y-2 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
              />
            </div>

            <div>
              <h3 className="font-display text-heading-3 tracking-tight transition-colors duration-300 group-hover:text-accent">
                {category.name}
              </h3>
              <p className="mt-1.5 text-caption uppercase text-tertiary">
                {category.slug === "personalizados"
                  ? "Peças sob consulta"
                  : `${category.productCount} produtos`}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
