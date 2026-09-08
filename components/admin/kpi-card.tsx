import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "alert";

const toneClasses: Record<Tone, string> = {
  neutral: "text-tertiary",
  positive: "text-accent",
  alert: "text-clay",
};

interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
}

/** Cartão de número do painel: etiqueta, número em Fraunces, nota curta. */
export function KpiCard({ label, value, note, tone = "neutral" }: KpiCardProps) {
  return (
    <div className="border border-border-subtle bg-surface p-[18px]">
      <div className="text-caption uppercase text-tertiary">{label}</div>
      {/* Fluido, não fixo: "A receber" é um preço, e `R$ 22.951,05` a 34px
          mede ~245px — mais que os ~222px do cartão quando a grade abre duas
          colunas por volta de 480px. */}
      <div className="mt-2.5 break-words font-display text-[clamp(26px,5vw,34px)] font-light leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </div>
      {note && (
        <div className={cn("mt-2 text-[13px]", toneClasses[tone])}>{note}</div>
      )}
    </div>
  );
}
