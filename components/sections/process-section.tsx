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
      className="ink relative mt-[clamp(72px,14vh,170px)] overflow-hidden py-[clamp(60px,12vh,150px)]"
    >
      <div className="shell">
        <span className="label text-tertiary">04 · Do digital ao real</span>

        <div className="mt-5 flex flex-wrap items-end gap-[clamp(24px,5vw,70px)]">
          <h2
            id="processo-titulo"
            className="min-w-0 flex-[1_1_min(100%,460px)] font-display text-[clamp(32px,6vw,84px)] font-light leading-[0.98] tracking-[-0.03em]"
          >
            Sete horas
            <br />
            de máquina
            <br />
            <span className="type-outline italic">por objeto.</span>
          </h2>

          <p className="max-w-[400px] flex-[1_1_min(100%,300px)] text-body text-secondary">
            A impressora não termina o trabalho: ela começa. Depois vem a
            remoção de suporte, a lixa em três grãos, a checagem de encaixe e a
            embalagem — tudo aqui, à mão.
          </p>
        </div>

        <div className="mt-[clamp(40px,8vh,88px)] flex flex-wrap gap-[clamp(18px,3vw,40px)]">
          <div className="min-w-[240px] flex-[1_1_min(100%,300px)] border border-border-strong p-[22px]">
            <div className="relative h-[clamp(240px,40vh,380px)] overflow-hidden bg-surface">
              <AtelierVideo
                src={ATELIER_MEDIA.process.src}
                poster={poster.url}
                alt={poster.alt}
              />
            </div>
            <div className="mt-3.5 flex justify-between text-[10.5px] font-semibold uppercase tracking-[0.16em] text-tertiary">
              <span>Nº 001 · em produção</span>
              <span className="text-clay">0,12 mm</span>
            </div>
          </div>

          <ProcessStages stages={PROCESS_STAGES} />
        </div>
      </div>
    </section>
  );
}
