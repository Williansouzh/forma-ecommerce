"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/animations";

const STAGES = [
  {
    title: "Modelagem 3D",
    description:
      "Toda peça nasce em um modelo digital de alta precisão, revisado em malha e espessura antes de ir para a fila de impressão.",
  },
  {
    title: "Escolha do material",
    description:
      "Resina para detalhes finos, PLA+ para acabamento acetinado, PETG para peças que pedem resistência.",
  },
  {
    title: "Impressão camada por camada",
    description:
      "Alturas de camada de até 50 micrômetros. Cada objeto é acompanhado em tempo real durante a produção.",
  },
  {
    title: "Acabamento manual",
    description:
      "Cura, lixamento em sete etapas e pintura quando aplicável — sempre à mão, nunca às pressas.",
  },
  {
    title: "Controle de qualidade e envio",
    description:
      "Inspeção final sob luz direta, embalagem protetiva e código de rastreio no mesmo dia.",
  },
];

export function ProcessSection() {
  return (
    <section
      id="processo"
      aria-labelledby="processo-titulo"
      className="bg-surface-muted py-24 md:py-32"
    >
      <div className="shell max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <p className="flex items-center gap-3 text-caption uppercase text-secondary">
            <span aria-hidden className="h-px w-8 bg-accent" />
            Transparência total
          </p>
          <h2
            id="processo-titulo"
            className="mt-4 font-display text-display-2 tracking-tight"
          >
            Do arquivo digital ao objeto real
          </h2>
          <p className="mt-5 text-body-large leading-relaxed text-secondary">
            Não há mágica na impressão 3D — há método. Este é o mesmo ciclo
            que constrói cada peça do estúdio.
          </p>
        </motion.div>

        <ol className="relative mt-16 space-y-12 border-l border-border-strong pl-10">
          {STAGES.map((stage, index) => (
            <motion.li
              key={stage.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.4,
                delay: index * 0.15,
                ease: EASE_OUT,
              }}
              className="group relative"
            >
              <span
                aria-hidden
                className="absolute -left-[46px] top-1 flex size-3 items-center justify-center rounded-full border border-border-strong bg-background"
              >
                <span className="size-[6px] rounded-full bg-quaternary transition-colors duration-300 group-hover:bg-accent" />
              </span>

              <p className="font-mono text-micro uppercase tracking-[0.25em] text-tertiary">
                Etapa {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1.5 font-display text-heading-3 tracking-tight">
                {stage.title}
              </h3>
              <p className="mt-1.5 max-w-lg text-body leading-relaxed text-secondary">
                {stage.description}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
