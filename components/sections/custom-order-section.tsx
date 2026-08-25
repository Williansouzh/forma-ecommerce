"use client";

import { motion } from "framer-motion";
import { Box, Lightbulb, PackageCheck, Printer, Layers } from "lucide-react";
import Link from "next/link";
import { staggerContainer, fadeUp, VIEWPORT_ONCE } from "@/lib/animations";

const steps = [
  {
    icon: Lightbulb,
    title: "Ideia",
    description: "Você traz a referência, nós traduzimos em briefing.",
  },
  {
    icon: Box,
    title: "Modelo 3D",
    description: "Modelagem digital com prévia para sua aprovação.",
  },
  {
    icon: Layers,
    title: "Material",
    description: "Resina, PLA+ ou PETG conforme o uso da peça.",
  },
  {
    icon: Printer,
    title: "Produção",
    description: "Impressão camada por camada com controle de qualidade.",
  },
  {
    icon: PackageCheck,
    title: "Entrega",
    description: "Acabamento manual e embalagem editorial.",
  },
];

export function CustomOrderSection() {
  return (
    <section aria-labelledby="custom-titulo" className="shell py-24 md:py-32">
      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
      >
        <motion.div
          variants={fadeUp}
          className="rounded-xl bg-surface-muted px-6 py-16 text-center md:px-16"
        >
          <p className="flex items-center justify-center gap-3 text-caption uppercase text-tertiary">
            <span className="text-accent">03</span>
            <span aria-hidden className="h-px w-8 bg-quaternary" />
            Sob medida
          </p>
          <h2
            id="custom-titulo"
            className="mx-auto mt-3 max-w-2xl font-display text-display-2 tracking-tight"
          >
            Tem uma ideia? Nós materializamos.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-large text-secondary">
            Do rascunho no papel à peça nas suas mãos — um processo transparente
            em cinco etapas.
          </p>

          <ol className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12, duration: 0.45 }}
                className="group flex flex-col items-center gap-3 text-center"
              >
                <span className="flex size-14 items-center justify-center rounded-lg border border-border-subtle bg-surface text-accent transition-transform duration-200 group-hover:scale-110 group-hover:border-accent/30">
                  <step.icon size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-caption uppercase text-secondary">
                    {String(index + 1).padStart(2, "0")} · {step.title}
                  </p>
                  <p className="mt-1 text-body-small text-tertiary">
                    {step.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>

          <Link
            href="/personalizados"
            className="mt-14 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-body font-medium text-background transition-all hover:-translate-y-px hover:bg-accent hover:text-white active:scale-[0.98]"
          >
            Solicitar orçamento
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
