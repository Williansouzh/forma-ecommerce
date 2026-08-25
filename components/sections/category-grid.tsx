"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { CategoryIndexList } from "@/components/sections/category-index-list";
import { staggerContainer, fadeUp, VIEWPORT_ONCE } from "@/lib/animations";

export function CategoryIndex() {
  return (
    <section aria-labelledby="categorias-titulo" className="shell py-24 md:py-32">
      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
      >
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <motion.p
              variants={fadeUp}
              className="flex items-center gap-3 text-caption uppercase text-tertiary"
            >
              <span className="text-accent">02</span>
              <span aria-hidden className="h-px w-8 bg-quaternary" />
              Índice
            </motion.p>
            <motion.h2
              id="categorias-titulo"
              variants={fadeUp}
              className="mt-3 font-display text-display-2 tracking-tight"
            >
              Coleções
            </motion.h2>
          </div>
          <Link
            href="/colecoes"
            className="nav-link hidden pb-1 text-body-small font-medium text-accent md:block"
          >
            Ver todas
          </Link>
        </div>

        <motion.div variants={fadeUp}>
          <CategoryIndexList categories={CATEGORIES} />
        </motion.div>
      </motion.div>
    </section>
  );
}
