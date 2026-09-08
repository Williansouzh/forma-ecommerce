import Image from "next/image";
import { SectionHeading } from "@/components/sections/section-heading";
import { DEFAULT_LOOKBOOK } from "@/lib/home-media";
import type { LookbookImage } from "@/types/settings";

/**
 * As peças na casa de quem comprou, com o cômodo e o bairro — a prova social
 * que a loja de fato tem.
 *
 * As seis fotos vêm de fora desde que o painel pode trocá-las; os valores
 * antigos viraram o padrão em `lib/home-media.ts`.
 */

function Figure({ photo }: { photo: LookbookImage }) {
  return (
    <figure className="group/photo m-0 w-[min(72vw,360px)] shrink-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 72vw, 360px"
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0.6,0.3,1)] group-hover/photo:scale-[1.03]"
        />
      </div>
      {/* Cômodo e bairro vêm do painel, sem limite de tamanho: sem `min-w-0`
          um texto longo empurrava o outro para fora da foto. */}
      <figcaption className="mt-3 flex justify-between gap-3 text-[13px] text-tertiary">
        <span className="min-w-0 truncate">{photo.room}</span>
        <span className="min-w-0 shrink-0 truncate">{photo.place}</span>
      </figcaption>
    </figure>
  );
}

export function LookbookSection({ photos: configured }: { photos?: LookbookImage[] } = {}) {
  const photos = configured ?? DEFAULT_LOOKBOOK;
  return (
    <section aria-labelledby="lookbook-titulo" className="section-rhythm">
      <div className="shell">
        <SectionHeading
          id="lookbook-titulo"
          title="Na casa de quem comprou"
          note="Arraste para o lado"
        />
      </div>

      {/*
        A faixa rolava sozinha em laço infinito de 48s e pausava no hover — o
        que no celular significava não pausar nunca. Agora quem rola é o
        leitor, e a barra fica escondida.

        Sem `scroll-snap`: com encaixe obrigatório o Chrome alinhava a primeira
        foto ao início do scrollport e comia o recuo da esquerda, deixando a
        foto colada na borda da janela.
      */}
      <div className="no-scrollbar mt-8 flex gap-[clamp(14px,2vw,24px)] overflow-x-auto px-[clamp(16px,4vw,64px)] pb-2">
        {photos.map((photo) => (
          <Figure key={photo.url} photo={photo} />
        ))}
      </div>
    </section>
  );
}
