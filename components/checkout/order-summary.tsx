"use client";

import Image from "next/image";
import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { CartItem, CartTotals } from "@/types";
import { formatPrice } from "@/lib/utils";

export function OrderSummary({
  items,
  totals,
  pixDiscount = 0,
}: {
  items: CartItem[];
  totals: CartTotals;
  pixDiscount?: number;
}) {
  const targetTotal =
    totals.total - Math.round(totals.subtotal * pixDiscount);
  const spring = useSpring(targetTotal, { stiffness: 120, damping: 22 });
  const display = useTransform(spring, (value) =>
    formatPrice(Math.max(0, Math.round(value)))
  );

  useEffect(() => {
    spring.set(targetTotal);
  }, [spring, targetTotal]);

  return (
    <aside
      aria-label="Resumo do pedido"
      className="h-fit rounded-lg border bg-surface p-6 lg:sticky lg:top-28"
    >
      <h2 className="font-display text-heading-3">Resumo do pedido</h2>

      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li
            key={`${item.productId}-${item.variantId ?? "default"}`}
            className="flex items-center gap-3"
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-muted">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name ?? ""}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              )}
              <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-bl-md bg-primary text-micro text-background">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-small font-medium">{item.name}</p>
              {item.variantName && (
                <p className="text-micro uppercase text-tertiary">
                  {item.variantName}
                </p>
              )}
            </div>
            <p className="text-body-small tabular-nums text-secondary">
              {formatPrice(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-2 border-t border-border-subtle pt-4 text-body-small">
        <div className="flex justify-between text-secondary">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-secondary">
          <dt>Frete</dt>
          <dd className="tabular-nums">
            {totals.shipping === 0 ? "Grátis" : formatPrice(totals.shipping)}
          </dd>
        </div>
        {pixDiscount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Desconto Pix (5%)</dt>
            <dd className="tabular-nums">
              −{formatPrice(Math.round(totals.subtotal * pixDiscount))}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-border-subtle pt-3 text-heading-3">
          <dt>Total</dt>
          <motion.dd className="tabular-nums" aria-live="polite">
            {display}
          </motion.dd>
        </div>
      </dl>

      <p className="mt-4 text-caption uppercase text-tertiary">
        Pagamento seguro · Pix, cartão ou boleto
      </p>
    </aside>
  );
}
