"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { staggerContainer, fadeUp, VIEWPORT_ONCE } from "@/lib/animations";

export function CTASection() {
  return (
    <section aria-labelledby="cta-titulo" className="bg-background">
      <motion.div
        variants={staggerContainer(0.15)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-120px" }}
        className="shell mx-auto max-w-4xl py-32 text-center md:py-48"
      >
        <motion.h2
          id="cta-titulo"
          variants={fadeUp}
          className="font-display text-display-1 tracking-tight"
        >
          Imagine.
          <br />
          Nós imprimimos<span className="text-accent">.</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-8 max-w-xl text-body-large leading-relaxed text-secondary"
        >
          Descreva o objeto que existe na sua cabeça. Nosso estúdio cuida da
          modelagem, da produção e da entrega.
        </motion.p>

        <motion.div variants={fadeUp}>
          <Link
            href="/personalizados"
            className="group mt-12 inline-flex items-center justify-center gap-3 rounded-md bg-accent px-10 py-4 text-body font-medium text-white shadow-glow transition-all hover:-translate-y-px hover:bg-accent-dark active:scale-[0.98]"
          >
            Começar um projeto
            <ArrowRight
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
