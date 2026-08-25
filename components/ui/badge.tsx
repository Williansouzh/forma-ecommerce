import { cn } from "@/lib/utils";

type Variant = "default" | "accent" | "success" | "warning" | "error" | "muted";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-primary text-background",
  accent: "bg-accent text-white",
  success: "bg-success/10 text-success border border-success/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
  error: "bg-error/10 text-error border border-error/20",
  muted: "bg-surface-muted text-secondary border border-border-subtle",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-caption uppercase",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
