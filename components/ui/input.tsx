import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-caption uppercase text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "h-11 w-full rounded-md border bg-surface px-4 text-body text-primary placeholder:text-tertiary transition-colors focus:border-accent focus:outline-none",
            error ? "border-error" : "border-strong",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-caption text-tertiary">{hint}</p>}
        {error && (
          <p id={`${inputId}-error`} className="text-caption text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
