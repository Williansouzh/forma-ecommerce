import { cn } from "@/lib/utils";

type Variant = "default" | "accent" | "clay" | "muted" | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

/**
 * Etiqueta de loja, não pílula de dashboard: sem monoespaçada, sem cor
 * semântica, sem canto arredondado. Status de estoque vira texto em prosa —
 * ver `availabilityNote` no card de produto.
 */
const variantClasses: Record<Variant, string> = {
  default: "bg-primary text-background",
  accent: "bg-accent text-background",
  clay: "bg-clay text-background",
  muted: "bg-surface-muted text-secondary",
  outline: "border border-border-strong text-secondary",
};

export function Badge({
  className,
  variant = "outline",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
