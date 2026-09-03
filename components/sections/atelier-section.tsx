"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/animations";
import { AtelierVideo } from "@/components/shared/atelier-video";
import { ATELIER_MEDIA } from "@/lib/atelier-media";

/** Números do ateliê. Trocar aqui quando a realidade mudar. */
const NUMBERS = [
  { value: "4", label: "impressoras rodando" },
  { value: "1.200+", label: "peças entregues" },
  { value: "0,12 mm", label: "altura de camada" },
  { value: "2024", label: "primeira peça" },
];

const GALLERY = [
  { src: "/images/products/painel-02.jpg", alt: "Detalhe dos discos coloridos impressos em 3D" },
  { src: "/images/products/dino-02.jpg", alt: "Peças de dinossauro impressas em 3D sobre a bancada" },
  { src: "/images/products/cactos-04.jpg", alt: "Cactos impressos em 3D em detalhe" },
];

export function AtelierSection() {
  return (
    <section
      id="atelie"
      aria-labelledby="atelie-titulo"
      className="py-32 md:py-44"
    >
      <div className="shell">
        <p className="label text-tertiary">O ateliê</p>

        <div className="mt-5 flex flex-wrap items-end gap-x-[clamp(24px,5vw,70px)] gap-y-8">
          <h2
            id="atelie-titulo"
            className="min-w-0 flex-1 basis-[min(100%,520px)] font-display text-display-1"
          >
            Quatro máquinas,
            <br />
            <em className="italic text-accent">uma bancada.</em>
          </h2>
          <p className="min-w-0 max-w-[420px] flex-1 basis-[min(100%,300px)] text-body-large text-secondary">
            Aqui não existe estoque parado: a fila começa quando o seu pedido
            entra. Três impressoras de filamento e uma de resina rodam quase
            todos os dias, e o acabamento é sempre manual.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mt-[clamp(34px,6vh,70px)] border border-border-strong p-5"
        >
          <div className="relative h-[clamp(260px,44vh,440px)] overflow-hidden bg-surface-muted">
            <AtelierVideo {...ATELIER_MEDIA.bench} />
          </div>
          <div className="mt-3.5 flex justify-between text-[10.5px] font-semibold uppercase tracking-[0.16em] text-tertiary">
            <span>Bancada · em produção</span>
            <span className="text-clay">0,12 mm</span>
          </div>
        </motion.div>

        <dl className="mt-[clamp(50px,10vh,120px)] flex flex-wrap gap-x-[clamp(20px,4vw,60px)] gap-y-10 border-t border-border-strong pt-7">
          {NUMBERS.map((item) => (
            <div key={item.label} className="flex-1 basis-40">
              <dt className="sr-only">{item.label}</dt>
              <dd>
                <span className="block font-display text-display-2 tabular-nums">
                  {item.value}
                </span>
                <span className="mt-2 block text-caption uppercase text-tertiary">
                  {item.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-[clamp(34px,7vh,80px)] flex flex-wrap gap-[clamp(14px,2vw,24px)]">
          {GALLERY.map((photo) => (
            <div
              key={photo.src}
              className="relative aspect-square min-w-0 flex-1 basis-[min(100%,280px)] overflow-hidden bg-surface-muted"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover saturate-[0.94]"
              />
            </div>
          ))}
        </div>

        <div className="mt-[clamp(30px,6vh,60px)] flex flex-wrap gap-3">
          <Link
            href="/personalizados"
            className="inline-flex min-h-[54px] items-center rounded-md bg-primary px-7 font-semibold text-background transition-colors duration-300 hover:bg-accent"
          >
            Solicitar orçamento
          </Link>
          <Link
            href="/colecoes"
            className="inline-flex min-h-[54px] items-center rounded-md border border-border-strong px-6 font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Ver a coleção
          </Link>
        </div>
      </div>
    </section>
  );
}
