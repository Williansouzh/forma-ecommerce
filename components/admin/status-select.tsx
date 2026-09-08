"use client";

import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from "@/lib/order-status";
import type { OrderStatus } from "@/types/order";

interface StatusSelectProps {
  value: OrderStatus;
  label: string;
  disabled?: boolean;
  onChange: (status: OrderStatus) => void;
}

/** Seletor de estágio de um pedido. Trocar dispara o PATCH imediatamente. */
export function StatusSelect({
  value,
  label,
  disabled,
  onChange,
}: StatusSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as OrderStatus)}
      className={cn(
        "min-h-[38px] w-full rounded-md border border-strong bg-surface px-2.5 text-[16px] outline-none transition-colors focus:border-accent disabled:opacity-50"
      )}
    >
      {ORDER_STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {ORDER_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
