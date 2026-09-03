"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
}: QuantitySelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center border border-border-strong",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
        className="flex h-full w-11 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-30"
      >
        <Minus size={15} strokeWidth={1} />
      </button>
      <span
        aria-live="polite"
        aria-label={`Quantidade: ${value}`}
        className="w-10 text-center text-body-small tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
        className="flex h-full w-11 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-30"
      >
        <Plus size={15} strokeWidth={1} />
      </button>
    </div>
  );
}
