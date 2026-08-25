import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-dark hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  secondary:
    "border border-strong bg-transparent text-primary hover:bg-surface-muted hover:border-primary/30",
  ghost: "bg-transparent text-primary hover:bg-surface-muted",
  link: "bg-transparent text-accent underline-offset-4 hover:underline p-0 h-auto",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-body-small rounded-md",
  md: "h-11 px-6 text-body-small rounded-md font-medium",
  lg: "h-13 px-8 py-3.5 text-body rounded-md font-medium",
  xl: "h-14 px-10 text-body rounded-md font-medium",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-40",
        variant !== "link" && sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
