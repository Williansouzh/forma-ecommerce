"use client";

import { useMemo, useState } from "react";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/lib/constants";
import { formatPrice, maskCEP } from "@/lib/utils";

interface ShippingEstimatorProps {
  subtotal?: number;
  compact?: boolean;
}

function estimateBusinessDays(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const first = Number(digits[0]);
  if (first <= 1) return "2 a 4 dias úteis";
  if (first <= 4) return "4 a 7 dias úteis";
  return "6 a 10 dias úteis";
}

export function ShippingEstimator({
  subtotal = 0,
  compact = false,
}: ShippingEstimatorProps) {
  const [zipCode, setZipCode] = useState("");
  const deliveryWindow = useMemo(() => estimateBusinessDays(zipCode), [zipCode]);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  return (
    <section
      aria-label="Simular frete"
      className={compact ? "space-y-3" : "border border-primary bg-surface p-5"}
    >
      <div className="flex items-center gap-2">
        <span className="h-px w-6 bg-accent" aria-hidden />
        <h3 className="text-micro uppercase text-primary">
          Frete e prazo
        </h3>
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={compact ? "cart-zip" : "product-zip"}>
          CEP
        </label>
        <input
          id={compact ? "cart-zip" : "product-zip"}
          inputMode="numeric"
          value={zipCode}
          onChange={(event) => setZipCode(maskCEP(event.target.value))}
          placeholder="00000-000"
          className="h-11 min-w-0 flex-1 border border-primary bg-surface px-3 text-body-small outline-none transition-colors placeholder:text-tertiary focus:border-accent"
        />
        <div className="flex h-11 items-center border border-primary px-3 text-body-small tabular-nums">
          {shipping === 0 ? "Grátis" : formatPrice(shipping)}
        </div>
      </div>
      {deliveryWindow ? (
        <p className="text-caption text-secondary">
          Entrega estimada em {deliveryWindow} após a produção.
        </p>
      ) : (
        <p className="text-caption text-tertiary">
          Informe o CEP para estimar entrega. Produção começa após pagamento.
        </p>
      )}
    </section>
  );
}
