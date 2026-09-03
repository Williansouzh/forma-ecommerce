"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CATEGORIES, type Category } from "@/data/categories";
import { CategoryIndexList } from "@/components/sections/category-index-list";
import { staggerContainer, fadeUp, VIEWPORT_ONCE } from "@/lib/animations";

/** As contagens vêm do servidor; sem elas, mostra as categorias sem número. */
export function CategoryIndex({
  categories = CATEGORIES,
}: {
  categories?: Category[];
}) {
  return (
    <section aria-labelledby="categorias-titulo" className="shell py-32 md:py-44">
      <motion.div
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
      >
        <div className="mb-14 flex items-end justify-between gap-6">
          <div>
            <motion.p variants={fadeUp} className="label text-accent">
              Por onde começar
            </motion.p>
            <motion.h2
              id="categorias-titulo"
              variants={fadeUp}
              className="mt-5 font-display text-display-2"
            >
              Coleções
            </motion.h2>
          </div>
          <Link
            href="/colecoes"
            className="nav-link hidden pb-1 text-body-small text-primary md:block"
          >
            Ver todas
          </Link>
        </div>

        <motion.div variants={fadeUp}>
          <CategoryIndexList categories={categories} />
        </motion.div>
      </motion.div>
    </section>
  );
}
