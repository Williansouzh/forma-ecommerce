/**
 * A lista numerada de etapas, com o tempo à direita. Aparece no processo da
 * home (fundo escuro) e na tela do ateliê (fundo claro) — os tokens já viram
 * para o lado certo dentro de `.ink`, então o componente é o mesmo.
 */
export function ProcessStages({
  stages,
}: {
  stages: { title: string; meta: string }[];
}) {
  return (
    <ol className="min-w-[260px] flex-[1_1_min(100%,380px)]">
      {stages.map((stage, index) => (
        <li
          key={stage.title}
          className="flex items-baseline gap-5 border-t border-border-subtle py-[clamp(14px,2.4vw,22px)]"
        >
          <span className="text-micro font-bold tabular-nums text-quaternary">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 font-display text-[clamp(22px,3vw,34px)] font-light leading-[1.1]">
            {stage.title}
          </span>
          <span className="whitespace-nowrap text-[12.5px] text-tertiary">
            {stage.meta}
          </span>
        </li>
      ))}
    </ol>
  );
}
