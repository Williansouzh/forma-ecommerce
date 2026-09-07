"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { AtelierVideo } from "@/components/shared/atelier-video";
import { ATELIER_MEDIA } from "@/lib/atelier-media";
import { DEFAULT_ATELIER_POSTERS, DEFAULT_HERO } from "@/lib/home-media";
import type { HomeImage } from "@/types/settings";

/**
 * A foto ocupa a tela inteira e o texto se apoia nela pela base — é a peça que
 * apresenta o ateliê, não um bloco de texto ao lado de uma imagem. O degradê
 * existe só para o texto ter contraste; a foto continua sendo o assunto.
 *
 * O `slowzoom` roda em 20s: quem olha por três segundos não percebe, quem
 * fica parado percebe. Zoom mais rápido viraria banner de campanha.
 */
/**
 * A foto vem de fora desde que o painel pode trocá-la. O padrão continua
 * aqui como reserva: sem nada configurado, ou com a API fora, a vitrine é a
 * mesma de sempre.
 */
interface HeroSectionProps {
  image?: HomeImage;
  videoPoster?: HomeImage;
}

/** Os quatro selos da régua inferior — onde fica, desde quando, para onde envia. */
const CREDENTIALS = [
  { label: "Nº 001 · Vaso Canelado" },
  { label: "Campina Grande — PB" },
  { label: "Ateliê desde 2024" },
  { label: "Envio para todo o Brasil", accent: true },
];

export function HeroSection({ image, videoPoster }: HeroSectionProps = {}) {
  const hero = image ?? DEFAULT_HERO;
  const poster = videoPoster ?? DEFAULT_ATELIER_POSTERS.atelierHero;
  return (
    <section
      aria-label="Apresentação"
      className="ink relative flex min-h-[clamp(560px,88vh,900px)] items-end overflow-hidden"
    >
      <Image
        src={hero.url}
        alt={hero.alt}
        fill
        priority
        sizes="100vw"
        className="animate-slowzoom object-cover saturate-[0.92] brightness-[0.82] [transform-origin:60%_40%]"
      />

      {/* Só para o texto respirar sobre a foto — não é efeito de cor. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(27,26,21,0.88)_0%,rgba(27,26,21,0.42)_45%,rgba(27,26,21,0.18)_100%)]"
      />

      <div className="shell relative w-full py-[clamp(40px,8vh,96px)] pb-[clamp(28px,5vh,56px)]">
        <div className="mb-[clamp(18px,4vh,34px)] flex animate-fade-in items-center gap-3">
          <span aria-hidden className="h-px w-[34px] bg-border-strong" />
          <span className="label text-secondary">
            Ateliê de impressão 3D · Campina Grande
          </span>
        </div>

        <h1 className="font-display text-[clamp(46px,10.5vw,152px)] font-light leading-[0.9] tracking-[-0.03em] text-balance">
          <span className="block animate-fade-up">Feito camada</span>
          <span className="block animate-fade-up [animation-delay:130ms]">
            por camada,
          </span>
          <span className="type-outline block animate-fade-up italic [animation-delay:260ms]">
            à mão.
          </span>
        </h1>

        <div className="mt-[clamp(26px,5vh,48px)] flex flex-wrap items-end gap-x-[clamp(20px,4vw,56px)] gap-y-8">
          <p className="max-w-md flex-[1_1_300px] text-body text-secondary">
            Não temos estoque parado. Cada objeto é impresso depois do seu
            pedido, em 0,12 mm por camada, lixado e conferido peça por peça no
            nosso ateliê em Campina Grande.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/colecoes"
              className="group inline-flex min-h-[52px] items-center gap-3 rounded-md bg-primary px-[26px] text-[14px] font-semibold tracking-[0.02em] text-background transition-colors duration-300 hover:bg-accent hover:text-primary"
            >
              Explorar coleção
              <ArrowRight
                size={17}
                strokeWidth={1}
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/personalizados"
              className="inline-flex min-h-[52px] items-center rounded-md border border-border-strong px-6 text-[14px] font-medium text-primary transition-colors duration-300 hover:border-primary hover:bg-surface-muted"
            >
              Quero uma peça minha
            </Link>
          </div>
        </div>

        <div className="mt-[clamp(28px,6vh,58px)] flex flex-wrap gap-x-[clamp(14px,3vw,44px)] gap-y-2 border-t border-border-subtle pt-4 text-micro uppercase text-tertiary">
          {CREDENTIALS.map((item) => (
            <span key={item.label} className={item.accent ? "text-clay" : undefined}>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* A impressora rodando agora. Fica no alto à direita, longe do título. */}
      <div className="absolute right-[clamp(16px,4vw,64px)] top-[clamp(80px,14vh,150px)] hidden w-[168px] animate-fade-in rounded-lg border border-border-strong bg-[rgba(27,26,21,0.62)] p-3.5 backdrop-blur-[10px] [animation-delay:900ms] sm:block">
        <div className="flex items-center gap-[7px] text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
          <span aria-hidden className="size-1.5 animate-breathe rounded-full bg-clay" />
          Ao vivo
        </div>
        <div className="relative mt-3 h-[118px] overflow-hidden bg-surface">
          <AtelierVideo
            src={ATELIER_MEDIA.hero.src}
            poster={poster.url}
            alt={poster.alt}
          />
        </div>
        <div className="mt-2.5 text-[10.5px] uppercase tracking-[0.12em] text-tertiary">
          Camada 47 · 0,12 mm
        </div>
      </div>
    </section>
  );
}
