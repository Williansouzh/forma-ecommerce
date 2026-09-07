import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AtelierVideo } from "@/components/shared/atelier-video";
import { ATELIER_MEDIA } from "@/lib/atelier-media";
import { getStoreSettings } from "@/lib/settings";
import { resolveHomeMedia } from "@/lib/home-media";
import { ProcessStages } from "@/components/sections/process-stages";
import { AtelierNumbers } from "@/components/sections/atelier-numbers";
import { MATERIALS, PROCESS_STAGES } from "@/lib/atelier-facts";

export const metadata: Metadata = {
  title: "Ateliê — c3dcriativ",
  description:
    "Quatro máquinas e uma bancada em Campina Grande. As etapas, os materiais e o tempo real de cada peça.",
  alternates: { canonical: "/atelier" },
};

const GALLERY = [
  {
    src: "/images/products/painel-02.jpg",
    alt: "Detalhe dos discos coloridos impressos em 3D",
  },
  {
    src: "/images/products/dino-02.jpg",
    alt: "Peças de dinossauro impressas em 3D sobre a bancada",
  },
  {
    src: "/images/products/cactos-04.jpg",
    alt: "Cactos impressos em 3D em detalhe",
  },
];

/**
 * Dinâmica desde que o pôster da bancada é trocável pelo painel: estática, a
 * página serviria a imagem congelada no build.
 */
export const dynamic = "force-dynamic";

export default async function AtelierPage() {
  const media = resolveHomeMedia((await getStoreSettings()).homeMedia);
  return (
    <main className="pb-[clamp(60px,12vh,140px)]">
      <section className="shell pt-[clamp(34px,7vh,90px)]">
        <p className="label text-tertiary">O ateliê</p>

        <div className="mt-[18px] flex flex-wrap items-end gap-x-[clamp(24px,5vw,70px)] gap-y-8">
          <h1 className="min-w-0 flex-[1_1_min(100%,520px)] font-display text-display-1">
            Quatro máquinas,
            <br />
            <em className="italic text-accent">uma bancada.</em>
          </h1>
          <p className="max-w-[420px] flex-[1_1_min(100%,300px)] text-body-large text-secondary">
            Aqui não existe estoque parado: a fila começa quando o seu pedido
            entra. Três impressoras de filamento e uma de resina rodam quase
            todos os dias, e o acabamento é sempre manual.
          </p>
        </div>
      </section>

      <section className="shell pt-[clamp(34px,6vh,70px)]">
        <div className="flex flex-wrap gap-[clamp(18px,3vw,40px)]">
          <div className="min-w-[260px] flex-[1_1_min(100%,460px)] border border-border-strong p-5">
            <div className="relative h-[clamp(260px,44vh,440px)] overflow-hidden bg-surface-muted">
              <AtelierVideo
                src={ATELIER_MEDIA.bench.src}
                poster={media.atelierBench.url}
                alt={media.atelierBench.alt}
              />
            </div>
            <div className="data mt-3.5 flex justify-between text-[13px] text-tertiary">
              <span>Bancada · em produção</span>
              <span className="text-clay">0,12 mm</span>
            </div>
          </div>

          <ProcessStages stages={PROCESS_STAGES} />
        </div>
      </section>

      <section
        aria-labelledby="materiais-titulo"
        className="shell pt-[clamp(50px,10vh,120px)]"
      >
        <div className="flex flex-wrap items-baseline gap-4 border-b border-border-strong pb-5">
          <h2
            id="materiais-titulo"
            className="font-display text-display-2"
          >
            Materiais
          </h2>
          <span className="text-caption uppercase text-tertiary">
            o que usamos e por quê
          </span>
        </div>

        <div className="mt-7 grid gap-[clamp(16px,2.5vw,28px)] [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
          {MATERIALS.map((material) => (
            <article
              key={material.name}
              className="border border-border-subtle bg-surface p-[22px]"
            >
              <h3 className="font-display text-[22px]">{material.name}</h3>
              <p className="mb-4 mt-2.5 text-[14.5px] leading-[1.55] text-secondary">
                {material.use}
              </p>
              <div className="flex justify-between gap-2.5 border-t border-border-subtle pt-3 text-[12px] uppercase tracking-[0.1em] text-tertiary">
                <span>{material.finish}</span>
                <span className="tabular-nums">{material.time}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="shell pt-[clamp(50px,10vh,120px)]">
        <AtelierNumbers />

        <div className="mt-[clamp(34px,7vh,80px)] flex flex-wrap gap-[clamp(14px,2vw,24px)]">
          {GALLERY.map((photo) => (
            <div
              key={photo.src}
              className="relative aspect-square min-w-0 flex-[1_1_min(100%,280px)] overflow-hidden bg-surface-muted"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="mt-[clamp(30px,6vh,60px)] flex flex-wrap gap-3">
          <Link
            href="/personalizados"
            className="inline-flex min-h-[54px] items-center rounded-md bg-primary px-7 text-[14px] font-semibold text-background transition-colors duration-300 hover:bg-accent"
          >
            Solicitar orçamento
          </Link>
          <Link
            href="/colecoes"
            className="inline-flex min-h-[54px] items-center rounded-md border border-border-strong px-6 text-[14px] font-medium transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            Ver a coleção
          </Link>
        </div>
      </section>
    </main>
  );
}
