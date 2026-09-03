"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/animations";

/**
 * Sem a sombra dura 5px/5px do CTA anterior: neobrutalismo num site de linho
 * e serifa é escolher duas linguagens ao mesmo tempo.
 */
export function CTASection() {
  return (
    <section aria-labelledby="cta-titulo">
      <motion.div
        variants={staggerContainer(0.14)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        className="shell max-w-3xl py-40 md:py-56"
      >
        <motion.h2
          id="cta-titulo"
          variants={fadeUp}
          className="font-display text-display-1"
        >
          Manda a ideia. A gente transforma em objeto
          <span className="text-clay">.</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-10 max-w-lg text-body-large text-secondary"
        >
          Pode ser chaveiro com inicial, lembrança de casamento ou uma peça de
          decoração que não existe em catálogo nenhum. A gente responde com
          material, prazo e o que dá e o que não dá para fazer.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-12">
          <Link
            href="/personalizados"
            className="label inline-block border border-primary px-9 py-4 text-primary transition-colors duration-300 hover:bg-primary hover:text-background"
          >
            Contar a ideia
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
