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
      <div className="mt-2.5 font-display text-[34px] font-light leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </div>
      {note && (
        <div className={cn("mt-2 text-[13px]", toneClasses[tone])}>{note}</div>
      )}
    </div>
  );
}
