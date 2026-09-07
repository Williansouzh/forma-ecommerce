import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { AtelierVideo } from "@/components/shared/atelier-video";
import { ATELIER_MEDIA } from "@/lib/atelier-media";
import { DEFAULT_ATELIER_POSTERS, DEFAULT_HERO } from "@/lib/home-media";
import type { HomeImage } from "@/types/settings";

/**
 * A vitrine responde quatro perguntas antes de qualquer rolagem: o que a loja
 * vende, o diferencial, para quem, e o que fazer agora.
 *
 * A versão anterior era uma foto sangrada de 88vh com "Feito camada por
 * camada, à mão" em 152px. Bonita, e sobre método: quem chegava não descobria
 * ali o que estava à venda. A manchete agora nomeia três peças que existem no
 * catálogo — dragão articulado, vaso canelado, tag de pet — porque a amplitude
 * é o argumento, e nomear é mais rápido que descrever.
 *
 * A altura passou a ser a do conteúdo. `88vh` empurrava produto, preço e
 * categoria inteiramente para fora da primeira tela.
 */
interface HeroSectionProps {
  image?: HomeImage;
  videoPoster?: HomeImage;
}

/** Onde fica, desde quando, para onde envia. Prova barata e verdadeira. */
const CREDENTIALS = [
  "Ateliê em Campina Grande — PB",
  "Desde 2024",
  "Envio para todo o Brasil",
];

export function HeroSection({ image, videoPoster }: HeroSectionProps = {}) {
  const hero = image ?? DEFAULT_HERO;
  const poster = videoPoster ?? DEFAULT_ATELIER_POSTERS.atelierHero;

  return (
    <section aria-label="Apresentação" className="shell pt-8 md:pt-14">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-[clamp(32px,5vw,72px)]">
        {/* O texto vem primeiro também no celular: é o que responde "o que é
            isto?" sem custar uma rolagem. */}
        <div className="min-w-0 flex-[1_1_min(100%,480px)]">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-border-strong" />
            <span className="label text-tertiary">
              Ateliê de impressão 3D
            </span>
          </div>

          {/* Escala própria, menor que `display-1`: a manchete nomeia três
              peças e ocupa cinco linhas — a 88px ela empurrava os botões para
              fora da primeira tela, que é justamente o que se queria corrigir. */}
          <h1 className="mt-5 font-display text-[clamp(32px,4.2vw,56px)] font-bold leading-[1.05] tracking-[-0.025em] text-balance">
            Um dragão articulado, um vaso canelado e o chaveiro do seu cachorro.
          </h1>

          <p className="mt-6 max-w-[46ch] text-body-large text-secondary">
            Tudo impresso em 3D aqui em Campina Grande, uma peça por vez, na cor
            que você escolher. Nada fica em estoque parado — a sua sai depois
            que você pede.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/colecoes"
              className="group inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-md bg-primary px-6 text-[15px] font-semibold text-background transition-colors duration-200 hover:bg-accent sm:w-auto"
            >
              Ver a coleção
              <ArrowRight
                size={17}
                strokeWidth={1.75}
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/personalizados"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border-strong px-6 text-[15px] font-medium text-primary transition-colors duration-200 hover:border-primary sm:w-auto"
            >
              Quero uma peça minha
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border-subtle pt-4 text-[13px] text-tertiary">
            {CREDENTIALS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 flex-[1_1_min(100%,520px)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted sm:aspect-[5/4] lg:aspect-square">
            {/* Sem `saturate` e sem `brightness`: a foto de produto é a ficha
                técnica de cor, e três filtros empilhados mudavam o que o
                cliente achava que estava comprando. */}
            <Image
              src={hero.url}
              alt={hero.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 620px"
              className="object-cover motion-safe:md:animate-slowzoom"
            />
          </div>

          {/*
            A impressora rodando agora. Antes era `hidden sm:block`: o elemento
            mais difícil de copiar do site inteiro sumia justamente onde está a
            maior parte do tráfego. Agora é uma faixa, e ela aparece sempre.
          */}
          <div className="mt-3 flex items-center gap-4 border border-border-subtle p-3">
            <div className="relative aspect-square w-16 shrink-0 overflow-hidden bg-surface-muted">
              <AtelierVideo
                src={ATELIER_MEDIA.hero.src}
                poster={poster.url}
                alt={poster.alt}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-caption uppercase text-tertiary">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-accent motion-safe:animate-breathe"
                />
                Ao vivo no ateliê
              </div>
              <p className="data mt-1 text-[13px] text-secondary">
                Nº 001 · Vaso Canelado · camada 47 · 0,12 mm
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
