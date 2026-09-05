import Image from "next/image";
import { SectionHeading } from "@/components/sections/section-heading";

/** As peças na casa de quem comprou, com o cômodo e o bairro. */
const LOOKBOOK = [
  {
    src: "/images/products/cactos-03.jpg",
    alt: "Cactos impressos em 3D em fileira sobre estante",
    room: "Estante",
    place: "Catolé",
  },
  {
    src: "/images/products/vaso-canelado-02.jpg",
    alt: "Vaso canelado com flores sobre mesa de madeira",
    room: "Sala",
    place: "Bodocongó",
  },
  {
    src: "/images/products/suporte-02.jpg",
    alt: "Suporte de celular impresso em 3D na mesa de trabalho",
    room: "Home office",
    place: "Centro",
  },
  {
    src: "/images/products/dino-01.jpg",
    alt: "Mini dinossauros impressos em 3D com arco de exposição",
    room: "Quarto",
    place: "Alto Branco",
  },
  {
    src: "/images/products/vaso-nervura-02.jpg",
    alt: "Vaso nervurado rosa com bandeja",
    room: "Aparador",
    place: "Liberdade",
  },
  {
    src: "/images/products/painel-02.jpg",
    alt: "Painel de cores impresso em 3D em detalhe",
    room: "Ateliê",
    place: "Campina Grande",
  },
];

function Figure({
  photo,
  hidden,
}: {
  photo: (typeof LOOKBOOK)[number];
  hidden?: boolean;
}) {
  return (
    <figure
      aria-hidden={hidden}
      className="group/photo m-0 w-[min(78vw,420px)] shrink-0"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-muted">
        <Image
          src={photo.src}
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
export function LookbookSection() {
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
          {LOOKBOOK.map((photo) => (
            <Figure key={photo.src} photo={photo} />
          ))}
          {LOOKBOOK.map((photo) => (
            <Figure key={`${photo.src}-loop`} photo={photo} hidden />
          ))}
        </div>
      </div>
    </section>
  );
}
