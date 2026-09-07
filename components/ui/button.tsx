import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Raio de 6px e borda de 1px: o objeto tem canto reto, a interface não.
 *
 * O primário passa a virar laranja no hover em vez de esvaziar para
 * transparente. Esvaziar era o gesto de papel do sistema anterior — funcionava
 * no linho, mas sobre a bancada branca o botão simplesmente sumia.
 */
const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-background hover:bg-accent",
  secondary:
    "border border-border-strong bg-transparent text-primary hover:border-primary",
  ghost:
    "border border-transparent bg-transparent text-secondary hover:text-primary",
  link: "bg-transparent text-accent underline decoration-1 underline-offset-4 p-0 h-auto hover:decoration-2",
};

/*
 * Rótulo em caixa normal, na fonte display. A caixa alta com tracking de
 * 0,17em em 11px era etiqueta de vitrine de cerâmica: bonita e difícil de ler
 * no botão que fecha a compra. Nada abaixo de 44px de altura a partir do `md`,
 * que é o alvo de toque do sistema.
 */
const sizeClasses: Record<Size, string> = {
  sm: "h-10 px-4 text-[14px] font-semibold",
  md: "h-11 px-6 text-[15px] font-semibold",
  lg: "h-12 px-8 text-[15px] font-semibold",
  xl: "h-14 px-10 text-[16px] font-semibold",
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
        "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-md font-display transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40",
        variant !== "link" && sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
