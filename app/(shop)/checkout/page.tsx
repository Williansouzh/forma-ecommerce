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
import { PixPayment, type PixCharge } from "@/components/checkout/pix-payment";
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
    /** Cobrança Pix da loja, quando o Mercado Pago não está no caminho. */
    pix: PixCharge | null;
    total: number;
    whatsappNumber: string;
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

          {/* Sem link do Mercado Pago, o Pix da loja É o pagamento. Antes
              desta tela existir, quem chegava aqui sem o gateway configurado
              via o número do pedido e nenhuma forma de pagar. */}
          {!order.paymentUrl && order.pix && (
            <PixPayment
              charge={order.pix}
              total={order.total}
              orderCode={order.id}
              whatsappNumber={order.whatsappNumber}
            />
          )}

          {!order.paymentUrl && !order.pix && (
            <p className="mt-8 rounded-md bg-surface-muted px-5 py-4 text-body-small text-secondary">
              O ateliê vai entrar em contato para combinar o pagamento.
            </p>
          )}

          {/*
            Duas colunas no celular. Em fileira de quatro, cada etapa ficava
            com ~66px e "Pagamento aprovado" — 12px em caixa alta com 0,14em
            de entreletra — pede mais que isso só na primeira palavra.

            Os fios entre as bolinhas só existem a partir de `sm`, onde a
            fileira é de fato uma linha. Eles nunca chegaram a aparecer: os
            `first:hidden`/`last:hidden` valiam sobre a posição do fio dentro
            do próprio item — e ali ele é sempre o primeiro e sempre o último
            —, então os dois sumiam em todas as etapas. Agora quem decide é o
            índice, que é o que a regra queria dizer.
          */}
          <ol
            className="mt-12 grid grid-cols-2 gap-x-4 gap-y-7 text-left sm:flex sm:items-start sm:justify-between sm:gap-2"
            aria-label="Acompanhamento do pedido"
          >
            {pipeline.map((stage, index) => (
              <li
                key={stage}
                className="flex flex-col items-center gap-2 text-center sm:flex-1"
              >
                <span className="flex w-full items-center justify-center">
                  {index > 0 && (
                    <span className="hidden h-px flex-1 bg-border-subtle sm:block" />
                  )}
                  <span
                    className={
                      index === 0
                        ? "flex size-7 shrink-0 items-center justify-center border border-primary bg-primary text-micro font-medium text-background"
                        : "flex size-7 shrink-0 items-center justify-center border border-strong text-micro tabular-nums text-tertiary"
                    }
                  >
                    {index + 1}
                  </span>
                  {index < pipeline.length - 1 && (
                    <span className="hidden h-px flex-1 bg-border-subtle sm:block" />
                  )}
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
        pix?: PixCharge | null;
        whatsappNumber?: string;
        totals?: { total?: number };
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Falha ao enviar o pedido");

      setOrder({
        id: body.code ?? "",
        method,
        data,
        paymentUrl: body.paymentUrl ?? null,
        pix: body.pix ?? null,
        // O total vem do servidor: é ele que manda no preço, e é esse número
        // que está dentro do código Pix.
        total: body.totals?.total ?? payableTotal(totals, method === "pix" ? PIX_DISCOUNT : 0),
        whatsappNumber: body.whatsappNumber ?? "",
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

      {/*
        O resumo vem primeiro no DOM porque é o que precisa aparecer primeiro
        no celular — recolhido, com a contagem e o total. No desktop ele volta
        para a direita por `lg:order-last`, dentro do próprio componente.
      */}
      <div className="flex flex-wrap items-start gap-[clamp(28px,5vw,70px)]">
        <OrderSummary
          items={items}
          totals={totals}
          pixDiscount={payment === "pix" ? PIX_DISCOUNT : 0}
        />
        <CheckoutForm
          items={items}
          paymentMethod={payment}
          onPaymentMethodChange={setPayment}
          onComplete={completeOrder}
          total={payableTotal(totals, payment === "pix" ? PIX_DISCOUNT : 0)}
          submitting={submitting}
          submitError={submitError}
        />
      </div>
    </div>
  );
}
