"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { staggerContainer, fadeUp, VIEWPORT_ONCE } from "@/lib/animations";

const steps = [
  {
    code: "BRF",
    title: "Ideia",
    description: "Referência, medidas, uso e quantidade entram no briefing.",
  },
  {
    code: "MOD",
    title: "Modelo 3D",
    description: "Modelagem digital com prévia para sua aprovação.",
  },
  {
    code: "MAT",
    title: "Material",
    description: "PLA, PETG ou resina definidos pelo toque e pela função.",
  },
  {
    code: "PRT",
    title: "Produção",
    description: "Impressão camada por camada, sem esconder textura real.",
  },
  {
    code: "CHK",
    title: "Entrega",
    description: "Bordas conferidas, argola/encaixe testado e embalagem.",
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
          className="paper-surface px-6 py-20 md:px-16 md:py-24"
        >
          <p className="flex items-center justify-center gap-3 text-caption uppercase text-tertiary">
            <span className="text-accent">03</span>
            <span aria-hidden className="h-px w-8 bg-quaternary" />
            Encomendas
          </p>
          <h2
            id="custom-titulo"
            className="mx-auto mt-3 max-w-2xl font-display text-display-2 tracking-tight"
          >
            Quando a casa pede uma forma própria.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-large text-secondary">
            Do rascunho à peça pronta, o processo continua simples: referência,
            material, prévia e acabamento antes do envio.
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
                <span className="flex size-12 items-center justify-center border border-border-strong text-micro uppercase text-accent">
                  {step.code}
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
            className="label mt-14 inline-block border border-primary bg-primary px-9 py-4 text-background transition-colors duration-300 hover:bg-transparent hover:text-primary"
          >
            Solicitar orçamento
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
