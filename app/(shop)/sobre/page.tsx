import type { Metadata } from "next";
import Image from "next/image";
import { AtelierNumbers } from "@/components/sections/atelier-numbers";

export const metadata: Metadata = {
  title: "Sobre — c3dcriativ",
  description:
    "Começou com uma impressora na sala e uma lista de espera de amigos. Hoje são quatro máquinas rodando em Campina Grande.",
  alternates: { canonical: "/sobre" },
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
    src: "/images/products/suporte-03.jpg",
    alt: "Suporte de celular impresso em 3D em uso na mesa",
  },
];

export default function SobrePage() {
  return (
    <main className="gutter mx-auto w-full max-w-[1100px] pb-[clamp(60px,12vh,140px)] pt-[clamp(40px,9vh,120px)]">
      <p className="label text-tertiary">Sobre o ateliê</p>

      <h1 className="mt-5 font-display text-[clamp(32px,5.4vw,72px)] font-light leading-[1.04] tracking-[-0.03em] text-pretty">
        Começou com uma impressora na sala e uma lista de espera de amigos.
      </h1>

      <p className="mt-7 max-w-[620px] text-body text-secondary">
        Hoje são quatro máquinas rodando quase todo dia em Campina Grande. A
        gente modela, imprime, lixa, pinta quando precisa e embala. Nada é
        comprado pronto e revendido: se está no site, saiu daqui.
      </p>

      <p className="mt-[18px] max-w-[620px] text-body text-secondary">
        Gostamos de peças que a pessoa pega na mão e pergunta como foi feito. É
        por isso que deixamos a marca da camada visível em vez de esconder — ela
        é a assinatura do processo.
      </p>

      <div className="mt-[clamp(40px,8vh,90px)]">
        <AtelierNumbers />
      </div>

      <div className="mt-[clamp(40px,8vh,90px)] flex flex-wrap gap-[clamp(14px,2vw,24px)]">
        {GALLERY.map((photo) => (
          <div
            key={photo.src}
            className="relative aspect-square min-w-0 flex-[1_1_min(100%,300px)] overflow-hidden bg-surface-muted"
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
    </main>
  );
}
