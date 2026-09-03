"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/animations";

/**
 * Uma foto de ambiente sangrando até a borda direita da tela, texto encostado
 * à esquerda. Sem colagem em arco, sem parallax, sem float infinito: objeto de
 * decoração é pesado — ele pousa uma vez e fica parado.
 */
const HERO_IMAGE = {
  src: "/images/products/cacto-trancado-mesa-02.jpg",
  alt: "Conjunto de cactos decorativos impressos em 3D sobre mesa de madeira, com luz de janela",
};

export function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <section
      aria-label="Apresentação"
      className="relative overflow-hidden pt-24 lg:pt-20"
    >
      <div className="grid w-full items-center gap-y-14 lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }}
          className="order-2 w-full max-w-xl px-6 py-10 md:px-10 lg:order-1 lg:justify-self-end lg:py-0 lg:pl-16 lg:pr-14 xl:pl-24"
        >
          <p className="label text-accent">
            Objetos para casa, feitos em pequena escala
          </p>

          <h1 className="mt-8 font-display text-display-1">
            Peças pequenas para morar na casa
            <span className="text-clay">.</span>
          </h1>

          <p className="mt-8 max-w-md text-body-large text-secondary">
            Decoração, chaveiros e encomendas em PLA e resina. Textura aparente,
            cor quente, acabamento conferido à mão — para virar presente ou ficar
            na sua própria mesa.
          </p>

          <div className="mt-10">
            <Link
              href="/colecoes"
              className="label inline-block border border-primary bg-primary px-9 py-4 text-background transition-colors duration-300 hover:bg-transparent hover:text-primary"
            >
              Ver a coleção
            </Link>
          </div>

          <p className="mt-8 text-body-small italic text-tertiary">
            PLA, PETG e resina. Impresso em São Paulo, sob demanda.
          </p>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
          className="relative order-1 h-[56vh] w-full bg-surface-muted lg:order-2 lg:h-[88vh]"
        >
          <Image
            src={HERO_IMAGE.src}
            alt={HERO_IMAGE.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
