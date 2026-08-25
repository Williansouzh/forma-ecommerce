"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, PackageSearch } from "lucide-react";
import type { CartItem, PaymentMethod } from "@/types";
import {
  useCartStore,
  getCartTotals,
} from "@/stores/cart-store";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import {
  CheckoutForm,
  type CheckoutData,
} from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PIX_DISCOUNT } from "@/lib/constants";

const pipeline = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em produção",
  "Enviado",
];

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const clear = useCartStore((state) => state.clear);
  const totals = getCartTotals(items);
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [order, setOrder] = useState<{
    id: string;
    method: PaymentMethod;
    data: CheckoutData;
  } | null>(null);

  if (order) {
    return (
      <div className="shell pb-24 pt-28 md:pt-36">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center"
        >
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 size={40} className="text-success" />
          </span>
          <h1 className="mt-8 font-display text-display-2 tracking-tight">
            Pedido confirmado
          </h1>
          <p className="mt-3 text-body-large text-secondary">
            Obrigado, {order.data.firstName}! Enviamos a confirmação para{" "}
            <span className="font-medium text-primary">{order.data.email}</span>.
          </p>
          <p className="mt-6 inline-block rounded-md bg-surface-muted px-5 py-2.5 font-mono text-heading-3 tabular-nums tracking-wide">
            {order.id}
          </p>

          <ol className="mt-12 flex items-start justify-between gap-2 text-left" aria-label="Acompanhamento do pedido">
            {pipeline.map((stage, index) => (
              <li key={stage} className="flex flex-1 flex-col items-center gap-2 text-center">
                <span className="flex items-center w-full">
                  <span className="h-px flex-1 bg-border-subtle first:hidden" />
                  <span
                    className={
                      index === 0
                        ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-micro font-medium text-white"
                        : "flex size-7 shrink-0 items-center justify-center rounded-full border border-strong font-mono text-micro tabular-nums text-tertiary"
                    }
                  >
                    {index + 1}
                  </span>
                  <span className="h-px flex-1 bg-border-subtle last:hidden" />
                </span>
                <span className="text-micro uppercase leading-tight text-secondary">
                  {stage}
                </span>
              </li>
            ))}
          </ol>

          <Link
            href="/colecoes"
            className="mt-14 inline-flex h-13 items-center rounded-md border border-strong px-10 py-3.5 text-body font-medium transition-colors hover:bg-surface-muted"
          >
            Voltar para a loja
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!hasHydrated) return null;

  if (items.length === 0) {
    return (
      <div className="shell pb-24 pt-28 md:pt-36">
        <div className="mx-auto max-w-md py-20 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-surface-muted text-tertiary">
            <PackageSearch size={26} />
          </span>
          <h1 className="mt-6 font-display text-heading-2">Carrinho vazio</h1>
          <p className="mt-3 text-body-small text-secondary">
            Adicione peças ao carrinho antes de finalizar a compra.
          </p>
          <Link
            href="/colecoes"
            className="mt-8 inline-flex h-12 items-center rounded-md bg-accent px-8 text-body-small font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Explorar coleções
          </Link>
        </div>
      </div>
    );
  }

  const completeOrder = (data: CheckoutData, method: PaymentMethod) => {
    const id = `FRMA-${String(Date.now()).slice(-6)}`;
    setOrder({ id, method, data });
    clear();
    try {
      localStorage.removeItem("forma-checkout");
    } catch {}
  };

  return (
    <div className="shell pb-24 pt-28 md:pt-36">
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: "Checkout" }]}
      />
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <CheckoutForm
          items={items}
          paymentMethod={payment}
          onPaymentMethodChange={setPayment}
          onComplete={completeOrder}
        />
        <OrderSummary items={items} totals={totals} pixDiscount={payment === "pix" ? PIX_DISCOUNT : 0} />
      </div>
    </div>
  );
}
