import { ATELIER_NUMBERS } from "@/lib/atelier-facts";

/** Os quatro números do ateliê, numa régua. Aparece no Ateliê e no Sobre. */
export function AtelierNumbers() {
  return (
    <dl className="flex flex-wrap gap-x-[clamp(20px,4vw,60px)] gap-y-10 border-t border-border-strong pt-7">
      {ATELIER_NUMBERS.map((item) => (
        <div key={item.label} className="flex-[1_1_160px]">
          <dt className="sr-only">{item.label}</dt>
          <dd>
            <span className="block whitespace-nowrap font-display text-display-2 tabular-nums">
              {item.value}
            </span>
            <span className="mt-2 block text-caption uppercase text-tertiary">
              {item.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
