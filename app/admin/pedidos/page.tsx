"use client";

import { useState } from "react";
import { useAdminData } from "@/components/admin/admin-data";
import { StatusSelect } from "@/components/admin/status-select";
import { updateOrderStatus } from "@/lib/admin-api";
import {
  ORDER_FILTERS,
  ORDER_STATUS_LABELS,
  isPending,
  whatsappLink,
} from "@/lib/order-status";
import { cn, formatPrice } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { Order, OrderStatus, PaymentMethod } from "@/types/order";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão",
  boleto: "Boleto",
};

const chipClass = (active: boolean) =>
  cn(
    "min-h-[38px] rounded-md border px-3.5 text-[13.5px] transition-colors hover:border-accent",
    active
      ? "border-primary bg-primary text-background"
      : "border-border-strong bg-transparent text-primary"
  );

function summarizeItems(order: Order): string {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const names = order.items.map((item) => item.name).join(", ");
  return `${count} ${count === 1 ? "item" : "itens"} · ${names}`;
}

export default function AdminOrdersPage() {
  const { orders, loading, error, refresh } = useAdminData();
  const pushToast = useUIStore((state) => state.pushToast);
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [busy, setBusy] = useState<string | null>(null);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    setBusy(order.id);
    try {
      const updated = await updateOrderStatus(order.id, status);
      await refresh();
      // Só dizemos "cliente avisado" quando a mensagem realmente saiu.
      const stage = ORDER_STATUS_LABELS[status].toLowerCase();
      pushToast(
        updated.notification?.sent
          ? `${order.code} → ${stage} · cliente avisado no WhatsApp`
          : `${order.code} → ${stage}`
      );
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Falha ao mudar o status",
        "error"
      );
    } finally {
      setBusy(null);
    }
  };

  if (orders === null && !loading) {
    return (
      <div className="animate-fade-up">
        <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
          Pedidos
        </h1>
        <p className="mt-2 text-tertiary">
          A API respondeu 404 em <code>GET /api/v1/orders</code>. Suba a versão
          da API com o módulo de pedidos para esta tela funcionar.
        </p>
      </div>
    );
  }

  const rows = (orders ?? []).filter(
    (order) => filter === "todos" || order.status === filter
  );
  const pendingCount = (orders ?? []).filter((order) =>
    isPending(order.status)
  ).length;

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        Pedidos
      </h1>
      <p className="mt-1.5 text-tertiary">
        {orders?.length ?? 0} pedidos · {pendingCount} aguardando produção
      </p>

      <div className="my-[22px] flex flex-wrap gap-2">
        {ORDER_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={chipClass(filter === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-error/10 px-4 py-3 text-body-small text-error"
        >
          {error}
        </p>
      )}

      {/* Cartões no celular, tabela em telas maiores — mesmos dados, mesmos handlers. */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {loading ? (
          <p className="px-4 py-16 text-center text-body-small text-tertiary">
            Carregando pedidos…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-16 text-center text-body-small text-tertiary">
            {orders?.length
              ? "Nenhum pedido nesse estágio."
              : "Nenhum pedido ainda. Eles aparecem aqui assim que a loja fechar a primeira venda."}
          </p>
        ) : (
          rows.map((order) => (
            <div
              key={order.id}
              className={cn(
                "border border-border-subtle bg-surface p-3.5 transition-opacity",
                busy === order.id && "opacity-60"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold tabular-nums">{order.code}</span>
                <span className="tabular-nums">{formatPrice(order.total)}</span>
              </div>

              <div className="mt-1.5 truncate font-semibold">
                {order.customer.firstName} {order.customer.lastName}
              </div>
              <div className="truncate text-[13px] text-tertiary">
                {summarizeItems(order)} · {PAYMENT_LABELS[order.paymentMethod]}
              </div>

              <div className="mt-3 flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <StatusSelect
                    value={order.status}
                    label={`Status do pedido ${order.code}`}
                    disabled={busy === order.id}
                    onChange={(status) => void changeStatus(order, status)}
                  />
                </div>
                <a
                  href={whatsappLink(order.customer.phone, order.code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:text-clay"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden border border-border-subtle bg-surface md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[790px]">
            <div className="flex gap-3 border-b border-border-strong px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">
              <span className="w-[104px] shrink-0">Pedido</span>
              <span className="flex-1">Cliente</span>
              <span className="w-[110px] shrink-0">Total</span>
              <span className="w-[200px] shrink-0">Status</span>
              <span className="w-[92px] shrink-0 text-right">Contato</span>
            </div>

            {loading ? (
              <p className="px-4 py-16 text-center text-body-small text-tertiary">
                Carregando pedidos…
              </p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-16 text-center text-body-small text-tertiary">
                {orders?.length
                  ? "Nenhum pedido nesse estágio."
                  : "Nenhum pedido ainda. Eles aparecem aqui assim que a loja fechar a primeira venda."}
              </p>
            ) : (
              rows.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    "flex items-center gap-3 border-b border-border-subtle px-4 py-3 transition-opacity",
                    busy === order.id && "opacity-60"
                  )}
                >
                  <div className="w-[104px] shrink-0 font-semibold tabular-nums">
                    {order.code}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {order.customer.firstName} {order.customer.lastName}
                    </div>
                    <div className="truncate text-[13px] text-tertiary">
                      {summarizeItems(order)} ·{" "}
                      {PAYMENT_LABELS[order.paymentMethod]}
                    </div>
                  </div>

                  <div className="w-[110px] shrink-0 tabular-nums">
                    {formatPrice(order.total)}
                  </div>

                  <div className="w-[200px] shrink-0">
                    <StatusSelect
                      value={order.status}
                      label={`Status do pedido ${order.code}`}
                      disabled={busy === order.id}
                      onChange={(status) => void changeStatus(order, status)}
                    />
                  </div>

                  <div className="w-[92px] shrink-0 text-right">
                    <a
                      href={whatsappLink(order.customer.phone, order.code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:text-clay"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="mt-3.5 text-[13px] text-tertiary">
        Mudar o status salva na hora. Com o WhatsApp conectado e o aviso de
        etapa ligado, o cliente recebe a mensagem no mesmo gesto.
      </p>
    </div>
  );
}
