"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, PackageSearch } from "lucide-react";
import type { PaymentMethod } from "@/types";
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
import { payableTotal } from "@/lib/cart";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [order, setOrder] = useState<{
    id: string;
    method: PaymentMethod;
    data: CheckoutData;
    paymentUrl: string | null;
  } | null>(null);

  if (order) {
    return (
      <div className="shell pb-24 pt-[clamp(30px,6vh,70px)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center"
        >
          <span className="mx-auto flex size-20 items-center justify-center border border-success bg-success/10">
            <CheckCircle2 size={40} className="text-success" />
          </span>
          <h1 className="mt-8 font-display text-display-2 tracking-tight">
            Pedido confirmado
          </h1>
          <p className="mt-3 text-body-large text-secondary">
            Obrigado, {order.data.firstName}! Enviamos a confirmação para{" "}
            <span className="font-medium text-primary">{order.data.email}</span>.
          </p>
          <p className="mt-6 inline-block border border-primary bg-surface-muted px-5 py-2.5 text-heading-3 tabular-nums tracking-wide">
            {order.id}
          </p>

          {order.paymentUrl && (
            <a
              href={order.paymentUrl}
              className="mt-8 inline-flex h-13 items-center border border-primary bg-primary px-10 py-3.5 label text-background transition-colors hover:bg-transparent hover:text-primary"
            >
              Pagar agora
            </a>
          )}

          <ol className="mt-12 flex items-start justify-between gap-2 text-left" aria-label="Acompanhamento do pedido">
            {pipeline.map((stage, index) => (
              <li key={stage} className="flex flex-1 flex-col items-center gap-2 text-center">
                <span className="flex items-center w-full">
                  <span className="h-px flex-1 bg-border-subtle first:hidden" />
                  <span
                    className={
                      index === 0
                        ? "flex size-7 shrink-0 items-center justify-center border border-primary bg-primary text-micro font-medium text-background"
                        : "flex size-7 shrink-0 items-center justify-center border border-strong text-micro tabular-nums text-tertiary"
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
            className="mt-14 inline-flex h-13 items-center border border-primary px-10 py-3.5 text-body font-medium transition-colors hover:bg-surface-muted"
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
      <div className="shell pb-24 pt-[clamp(30px,6vh,70px)]">
        <div className="mx-auto max-w-md py-20 text-center">
          <span className="mx-auto flex size-16 items-center justify-center border border-primary bg-surface-muted text-tertiary">
            <PackageSearch size={26} />
          </span>
          <h1 className="mt-6 font-display text-heading-2">Carrinho vazio</h1>
          <p className="mt-3 text-body-small text-secondary">
            Adicione peças ao carrinho antes de finalizar a compra.
          </p>
          <Link
            href="/colecoes"
            className="mt-8 inline-flex h-12 items-center border border-primary bg-primary px-8 label text-background transition-colors hover:bg-transparent hover:text-primary"
          >
            Explorar coleções
          </Link>
        </div>
      </div>
    );
  }

  const completeOrder = async (data: CheckoutData, method: PaymentMethod) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          paymentMethod: method,
          customer: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            cpf: data.cpf,
          },
          shippingAddress: {
            street: data.street,
            number: data.number,
            complement: data.complement,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: "BR",
          },
        }),
      });
      const body = (await response.json()) as {
        code?: string;
        paymentUrl?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Falha ao enviar o pedido");

      setOrder({
        id: body.code ?? "",
        method,
        data,
        paymentUrl: body.paymentUrl ?? null,
      });
      clear();
      try {
        localStorage.removeItem("forma-checkout");
      } catch {}
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Falha ao enviar o pedido"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shell pb-24 pt-[clamp(30px,6vh,70px)]">
      <Breadcrumb
        items={[{ label: "Coleção", href: "/colecoes" }, { label: "Checkout" }]}
      />

      <h1 className="mb-[clamp(28px,5vh,54px)] mt-[18px] font-display text-display-2">
        Fechar pedido
      </h1>

      <div className="flex flex-wrap items-start gap-[clamp(28px,5vw,70px)]">
        <CheckoutForm
          items={items}
          paymentMethod={payment}
          onPaymentMethodChange={setPayment}
          onComplete={completeOrder}
          total={payableTotal(totals, payment === "pix" ? PIX_DISCOUNT : 0)}
          submitting={submitting}
          submitError={submitError}
        />
        <OrderSummary
          items={items}
          totals={totals}
          pixDiscount={payment === "pix" ? PIX_DISCOUNT : 0}
        />
      </div>
    </div>
  );
}
