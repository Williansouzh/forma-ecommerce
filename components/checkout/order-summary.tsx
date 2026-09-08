"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";
import type { CartItem, CartTotals } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { payableTotal } from "@/lib/cart";

/**
 * No celular o resumo é a primeira coisa da página, recolhido: uma linha com
 * a contagem de itens e o total, que abre no toque.
 *
 * Antes ele ficava DEPOIS do formulário inteiro — e, portanto, depois do botão
 * "Confirmar pedido · R$ 22.951,05". Quem comprava pelo celular confirmava um
 * pedido de cinco dígitos sem nunca ter visto o subtotal, o frete e o desconto
 * que compõem aquele número. No desktop nada muda: a coluna continua à direita,
 * aberta e `sticky`.
 */
export function OrderSummary({
  items,
  totals,
  pixDiscount = 0,
}: {
  items: CartItem[];
  totals: CartTotals;
  pixDiscount?: number;
}) {
  const targetTotal = payableTotal(totals, pixDiscount);
  const [open, setOpen] = useState(false);

  /**
   * O pedido inteiro sai junto, então quem manda no prazo é a peça mais
   * demorada da sacola — não a média nem a primeira.
   */
  const productionDays = items.reduce<number | null>((slowest, item) => {
    const days = item.productionTime;
    if (typeof days !== "number") return slowest;
    return slowest === null ? days : Math.max(slowest, days);
  }, null);
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
      /*
       * `order-first`/`lg:order-last`: no DOM o resumo vem antes do formulário,
       * que é a ordem certa para o celular; no desktop o flexbox devolve a
       * coluna para a direita. Não há problema de ordem de foco porque o único
       * elemento focável daqui — o botão de abrir — é `lg:hidden`.
       */
      className="order-first h-fit w-full rounded-lg border bg-surface lg:sticky lg:top-28 lg:order-last lg:w-[380px] lg:shrink-0"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="resumo-do-pedido"
        className="flex w-full items-center justify-between gap-3 p-5 text-left lg:hidden"
      >
        <span className="min-w-0">
          <span className="label block text-tertiary">Resumo</span>
          <span className="mt-1 block text-body-small text-secondary">
            {totals.count} {totals.count === 1 ? "item" : "itens"} ·{" "}
            {open ? "recolher" : "ver detalhes"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <motion.span className="data text-[17px] font-medium tabular-nums">
            {display}
          </motion.span>
          <ChevronDown
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className={cn(
              "text-tertiary transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      <div
        id="resumo-do-pedido"
        className={cn(
          "px-5 pb-5 lg:block lg:p-6",
          open ? "block" : "hidden"
        )}
      >
        <h2 className="label hidden text-tertiary lg:block">Resumo</h2>

        <ul className="space-y-4 lg:mt-6">
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
                {/* `line-clamp-2` e não `truncate`: um nome longo virava
                    "Miniatura Millennium F…" numa linha só, sem forma nenhuma
                    de ler o resto na tela em que se confere o pedido. */}
                <p className="line-clamp-2 break-words text-body-small font-medium">
                  {item.name}
                </p>
                {item.variantName && (
                  <p className="text-micro uppercase text-tertiary">
                    {item.variantName}
                  </p>
                )}
              </div>
              <p className="shrink-0 whitespace-nowrap text-body-small tabular-nums text-secondary">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 border-t border-border-subtle pt-4 text-body-small">
          <div className="flex justify-between gap-3 text-secondary">
            <dt className="min-w-0">Subtotal</dt>
            <dd className="shrink-0 whitespace-nowrap tabular-nums">
              {formatPrice(totals.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-secondary">
            <dt className="min-w-0">Frete</dt>
            <dd className="shrink-0 whitespace-nowrap tabular-nums">
              {totals.shipping === 0 ? "Grátis" : formatPrice(totals.shipping)}
            </dd>
          </div>
          {pixDiscount > 0 && (
            <div className="flex justify-between gap-3 text-success">
              <dt className="min-w-0">Desconto Pix (5%)</dt>
              <dd className="shrink-0 whitespace-nowrap tabular-nums">
                −{formatPrice(Math.round(totals.subtotal * pixDiscount))}
              </dd>
            </div>
          )}
          {productionDays !== null && (
            <div className="flex justify-between gap-3 text-secondary">
              <dt className="min-w-0">Prazo de produção</dt>
              <dd className="shrink-0 whitespace-nowrap tabular-nums">
                até {productionDays} dias úteis
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-border-subtle pt-3 text-heading-3">
            <dt className="min-w-0">Total</dt>
            <motion.dd
              className="shrink-0 whitespace-nowrap tabular-nums"
              aria-live="polite"
            >
              {display}
            </motion.dd>
          </div>
        </dl>

        <p className="mt-4 text-caption uppercase text-tertiary">
          Pagamento seguro · Pix, cartão ou boleto
        </p>
      </div>
    </aside>
  );
}
