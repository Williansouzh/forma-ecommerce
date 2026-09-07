import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/constants";

/**
 * Os cinco passos da encomenda, do lado do convite.
 *
 * Ficam numa lista vertical em vez de cinco círculos numa fila: cada passo tem
 * uma frase inteira, e frase não cabe embaixo de ícone. A ordem é a real —
 * ninguém escolhe cor antes de aprovar a prévia.
 */
const STEPS = [
  {
    title: "Você manda a ideia",
    text: "Foto, print, desenho no papel ou só a descrição no WhatsApp.",
  },
  {
    title: "Modelamos e mostramos",
    text: "Você recebe a prévia em 3D e aprova antes de qualquer impressão.",
  },
  {
    title: "Escolhe cor e material",
    text: "PLA fosco, silk, resina — com amostra de cor na mão.",
  },
  {
    title: "Imprimimos e acabamos",
    text: "Suporte removido, lixa em três grãos, encaixe conferido.",
  },
  {
    title: "Chega até você",
    text: "Embalada com proteção e cartão do ateliê, com rastreio.",
  },
];

export function CustomOrderSection() {
  return (
    <section
      aria-labelledby="custom-titulo"
      className="shell pt-[clamp(72px,14vh,170px)]"
    >
      <div className="flex flex-wrap gap-[clamp(28px,5vw,80px)] bg-surface-muted p-[clamp(28px,5vw,76px)]">
        <div className="min-w-[260px] flex-[1_1_min(100%,380px)]">
          <span className="label text-tertiary">Sob medida</span>

          <h2
            id="custom-titulo"
            className="mt-[18px] font-display text-display-2"
          >
            Você imagina.
            <br />
            <em className="italic text-accent">A gente imprime.</em>
          </h2>

          <p className="mt-[22px] max-w-[380px] text-body text-secondary">
            Um personagem, um presente com nome, a peça que quebrou e não se
            acha mais. Manda uma foto ou um desenho no WhatsApp — a gente
            responde com prazo e preço no mesmo dia.
          </p>

          <div className="mt-[30px] flex flex-wrap gap-3">
            <Link
              href="/personalizados"
              className="inline-flex min-h-[52px] items-center rounded-md bg-primary px-[26px] text-[14px] font-semibold text-background transition-colors duration-300 hover:bg-accent"
            >
              Solicitar orçamento
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[52px] items-center rounded-md border border-border-strong px-[22px] text-[14px] font-medium text-primary transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <ol className="min-w-[260px] flex-[1_1_min(100%,400px)]">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-[18px] border-t border-border-strong py-[18px]"
            >
              <span className="shrink-0 pt-[5px] text-micro font-bold tabular-nums text-clay">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong className="block font-display text-heading-3 font-normal">
                  {step.title}
                </strong>
                <span className="mt-1 block text-body-small text-secondary">
                  {step.text}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
