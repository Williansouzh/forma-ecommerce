import Image from "next/image";
import { SectionHeading } from "@/components/sections/section-heading";
import { DEFAULT_LOOKBOOK } from "@/lib/home-media";
import type { LookbookImage } from "@/types/settings";

/** As peças na casa de quem comprou, com o cômodo e o bairro. */
/**
 * As seis fotos vêm de fora desde que o painel pode trocá-las; os valores
 * antigos viraram o padrão em `lib/home-media.ts`. A tira é duplicada abaixo
 * para rolar sem emenda, então o tamanho seis não é decoração.
 */

function Figure({
  photo,
  hidden,
}: {
  photo: LookbookImage;
  hidden?: boolean;
}) {
  return (
    <figure
      aria-hidden={hidden}
      className="group/photo m-0 w-[min(78vw,420px)] shrink-0"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
        <Image
          src={photo.url}
          alt={hidden ? "" : photo.alt}
          fill
          sizes="(max-width: 768px) 78vw, 420px"
          className="object-cover saturate-[0.92] transition-transform duration-[900ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover/photo:scale-105"
        />
      </div>
      <figcaption className="mt-3 flex justify-between gap-3 text-[11.5px] font-semibold uppercase tracking-[0.15em] text-tertiary">
        <span>{photo.room}</span>
        <span>{photo.place}</span>
      </figcaption>
    </figure>
  );
}

/**
 * As peças fora do estúdio. A faixa rola sozinha e pausa no hover — quem quis
 * olhar uma foto não deveria correr atrás dela.
 */
export function LookbookSection({ photos: configured }: { photos?: LookbookImage[] } = {}) {
  const photos = configured ?? DEFAULT_LOOKBOOK;
  return (
    <section aria-labelledby="lookbook-titulo" className="pt-[clamp(64px,12vh,150px)]">
      <div className="shell">
        <SectionHeading
          number="05"
          id="lookbook-titulo"
          title="Em casa"
          note="Passe o mouse para pausar"
        />
      </div>

      <div className="group mt-[34px] overflow-hidden">
        <div className="flex w-max animate-marquee-slow gap-[clamp(14px,2vw,28px)] pl-[clamp(14px,2vw,28px)] group-hover:[animation-play-state:paused]">
          {photos.map((photo) => (
            <Figure key={photo.url} photo={photo} />
          ))}
          {photos.map((photo) => (
            <Figure key={`${photo.url}-loop`} photo={photo} hidden />
          ))}
        </div>
      </div>
    </section>
  );
}
