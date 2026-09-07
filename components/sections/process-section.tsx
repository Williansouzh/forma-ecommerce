import { AtelierVideo } from "@/components/shared/atelier-video";
import { ATELIER_MEDIA } from "@/lib/atelier-media";
import { DEFAULT_ATELIER_POSTERS } from "@/lib/home-media";
import type { HomeImage } from "@/types/settings";
import { PROCESS_STAGES } from "@/lib/atelier-facts";
import { ProcessStages } from "@/components/sections/process-stages";

/**
 * A única seção escura no meio da página, e é de propósito: aqui a loja para
 * de vender e mostra a oficina. O contraste faz a pausa.
 *
 * Cada etapa vem com o tempo real que leva. É a informação que explica o prazo
 * do card de produto — sem ela, "pronto em 4 dias" parece arbitrário.
 */

export function ProcessSection({ videoPoster }: { videoPoster?: HomeImage } = {}) {
  const poster = videoPoster ?? DEFAULT_ATELIER_POSTERS.atelierProcess;
  return (
    <section
      id="processo"
      aria-labelledby="processo-titulo"
      className="ink section-rhythm relative overflow-hidden py-[clamp(48px,7vw,88px)]"
    >
      <div className="shell">
        <span className="label text-tertiary">Do digital ao real</span>

        <div className="mt-5 flex flex-wrap items-end gap-[clamp(24px,5vw,70px)]">
          <h2
            id="processo-titulo"
            className="min-w-0 flex-[1_1_min(100%,460px)] font-display text-display-1"
          >
            Sete horas de máquina
            {/* O contorno de 1px em corpo de 84px lia como fonte que não
                carregou, e texto vazado não tem razão de contraste. A segunda
                linha se diferencia por cor. */}
            <span className="block text-accent">por objeto.</span>
          </h2>

          <p className="max-w-[400px] flex-[1_1_min(100%,300px)] text-body text-secondary">
            A impressora não termina o trabalho: ela começa. Depois vem a
            remoção de suporte, a lixa em três grãos, a checagem de encaixe e a
            embalagem — tudo aqui, à mão.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-[clamp(18px,3vw,40px)]">
          <div className="min-w-[240px] flex-[1_1_min(100%,300px)] border border-border-strong p-[22px]">
            <div className="relative h-[clamp(240px,40vh,380px)] overflow-hidden bg-surface">
              <AtelierVideo
                src={ATELIER_MEDIA.process.src}
                poster={poster.url}
                alt={poster.alt}
              />
            </div>
            <div className="data mt-3.5 flex justify-between text-[13px] text-tertiary">
              <span>Nº 001 · em produção</span>
              <span className="text-accent">0,12 mm</span>
            </div>
          </div>

          <ProcessStages stages={PROCESS_STAGES} />
        </div>
      </div>
    </section>
  );
}
