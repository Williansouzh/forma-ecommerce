import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Canto reto, borda de 1px, sem gradiente e sem sombra.
 * O primário inverte no hover em vez de escurecer — gesto de papel, não de app.
 */
const variantClasses: Record<Variant, string> = {
  primary:
    "border border-primary bg-primary text-background hover:bg-transparent hover:text-primary",
  secondary:
    "border border-border-strong bg-transparent text-primary hover:border-primary",
  ghost:
    "border border-transparent bg-transparent text-secondary hover:text-primary",
  link: "bg-transparent text-accent underline decoration-1 underline-offset-4 p-0 h-auto hover:decoration-2",
};

// Tipografia de etiqueta: caixa alta discreta, tracking aberto, peso 600.
const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-[11px] font-semibold uppercase tracking-[0.16em]",
  md: "h-11 px-6 text-[11px] font-semibold uppercase tracking-[0.17em]",
  lg: "h-12 px-8 text-[12px] font-semibold uppercase tracking-[0.18em]",
  xl: "h-14 px-10 text-[12px] font-semibold uppercase tracking-[0.19em]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-none transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40",
        variant !== "link" && sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
