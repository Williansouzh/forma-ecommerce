"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/animations";

/**
 * O teste: leia a frase em voz alta. Se soa como alguém explicando o próprio
 * trabalho na feira, está certo. Se soa como release técnico, reescreva.
 *
 * A numeração fica porque aqui a ordem carrega informação de verdade — é a
 * sequência real pela qual a peça passa.
 */
const STAGES = [
  {
    title: "Primeiro ela só existe na tela",
    description:
      "A gente gira o modelo, olha de todos os lados e ajusta o que ainda não fica de pé. Nada vai para a impressora antes disso.",
  },
  {
    title: "Escolher o material é escolher o toque",
    description:
      "Resina quando o desenho é miúdo e precisa aparecer. PLA quando queremos aquele fosco macio. PETG quando a peça vai apanhar no dia a dia.",
  },
  {
    title: "Camadas tão finas que a mão sente antes do olho ver",
    description:
      "A impressão leva horas e alguém passa para olhar. Peça pequena não perdoa desatenção no meio do caminho.",
  },
  {
    title: "O acabamento é onde a peça vira objeto",
    description:
      "Cura, lixa, e pintura quando o desenho pede. Sempre à mão, sempre devagar — é a parte que não dá para apressar.",
  },
  {
    title: "Antes de embalar, cada peça passa na luz da janela",
    description:
      "Bordas, encaixes, cor. Se passar, vai embrulhada com proteção e sai no mesmo dia.",
  },
];

export function ProcessSection() {
  return (
    <section
      id="processo"
      aria-labelledby="processo-titulo"
      className="bg-surface py-32 md:py-44"
    >
      <div className="shell grid gap-16 lg:grid-cols-[0.85fr_1fr] lg:gap-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="lg:sticky lg:top-32 lg:self-start"
        >
          <p className="label text-accent">Do estúdio</p>
          <h2 id="processo-titulo" className="mt-5 font-display text-display-2">
            Como isso vira objeto
          </h2>
          <p className="mt-6 max-w-sm text-body-large text-secondary">
            Não tem mágica na impressão 3D — tem paciência. Este é o caminho que
            toda peça faz aqui dentro, da tela até a sua mesa.
          </p>
        </motion.div>

        <ol className="space-y-14">
          {STAGES.map((stage, index) => (
            <motion.li
              key={stage.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: EASE_OUT,
              }}
              className="grid gap-x-8 gap-y-2 border-t border-border-subtle pt-6 sm:grid-cols-[3rem_1fr]"
            >
              <span className="font-display text-heading-3 tabular-nums text-tertiary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="max-w-md font-display text-heading-3 leading-snug">
                  {stage.title}
                </h3>
                <p className="mt-2 max-w-md text-body text-secondary">
                  {stage.description}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
