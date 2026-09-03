"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { KpiCard } from "@/components/admin/kpi-card";
import { useAdminData } from "@/components/admin/admin-data";
import { ATELIER_PRINTERS } from "@/lib/constants";
import { QUEUE_STATUSES } from "@/lib/order-status";
import { formatPrice } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";

/** Abaixo disso a peça entra na lista de estoque crítico. */
const LOW_STOCK = 3;

/**
 * A API ainda não guarda o progresso real da impressão; enquanto isso, a barra
 * é derivada do status do pedido — o suficiente para ler a fila de relance.
 */
const PROGRESS_BY_STATUS: Partial<Record<OrderStatus, number>> = {
  processing: 0,
  printing: 50,
  finishing: 85,
};

interface QueueEntry {
  key: string;
  name: string;
  orderId: string;
  variant: string;
  image?: string;
  progress: number;
}

function buildQueue(orders: Order[], products: Product[]): QueueEntry[] {
  const imageBySlugOrName = new Map(
    products.map((product) => [product.name, product.images[0]?.url])
  );
  return orders
    .filter((order) => QUEUE_STATUSES.includes(order.status))
    .flatMap((order) =>
      order.items.map((item, index) => ({
        key: `${order.id}-${index}`,
        name: item.name,
        orderId: order.code,
        variant: item.variantName ?? "Cor padrão",
        image: imageBySlugOrName.get(item.name),
        progress: PROGRESS_BY_STATUS[order.status] ?? 0,
      }))
    );
}

interface Alert {
  key: string;
  title: string;
  text: string;
  tone: "alert" | "positive";
}

export default function AdminDashboardPage() {
  const { products, orders, customRequests, loading, error } = useAdminData();
  const [today, setToday] = useState<string | null>(null);

  // Formatado depois da montagem: o fuso do servidor não é o da pessoa.
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    );
  }, []);

  const lowStock = products.filter(
    (product) => product.stock != null && product.stock <= LOW_STOCK
  );

  const queue = orders ? buildQueue(orders, products) : null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayOrders = orders?.filter(
    (order) => new Date(order.createdAt) >= startOfDay
  );
  const receivable = orders
    ?.filter((order) => order.status === "paid" || order.status === "processing")
    .reduce((sum, order) => sum + order.total, 0);

  // Orçamento em `received` é o que ninguém respondeu ainda.
  const unanswered = (customRequests ?? []).filter(
    (request) => request.status === "received"
  );

  const pending = "—";
  const pendingNote = "Aguardando o endpoint de pedidos";

  const alerts: Alert[] = [
    ...lowStock.map((product) => ({
      key: `stock-${product.id}`,
      title: `${product.name} com ${product.stock} ${
        product.stock === 1 ? "unidade" : "unidades"
      }`,
      text: product.productionTime
        ? `Prazo sobe para ${product.productionTime} dias se zerar. Repor filamento.`
        : "Repor filamento antes que zere.",
      tone: "alert" as const,
    })),
    ...(unanswered.length
      ? [
          {
            key: "custom-requests",
            title: `${unanswered.length} ${
              unanswered.length === 1
                ? "orçamento sob medida sem resposta"
                : "orçamentos sob medida sem resposta"
            }`,
            text:
              unanswered.length === 1
                ? `${unanswered[0].customerName} pediu pelo formulário do site.`
                : "Chegaram pelo formulário do site e ainda não foram respondidos.",
            tone: "alert" as const,
          },
        ]
      : []),
    ...(orders === null
      ? [
          {
            key: "orders-endpoint",
            title: "Pedidos ainda não chegam ao painel",
            text: "A API não expõe GET /api/v1/orders. Enquanto isso, a fila e os números de venda ficam em espera.",
            tone: "alert" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-heading-1 font-light tracking-[-0.02em]">
        Hoje no ateliê
      </h1>
      <p className="mt-2 text-tertiary">
        {today ?? "Carregando"} · {ATELIER_PRINTERS} impressoras ·{" "}
        {queue ? `fila de ${queue.length} peças` : "fila indisponível"}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error"
        >
          {error}
        </p>
      )}

      <div className="mt-7 grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
        <KpiCard
          label="Pedidos hoje"
          value={todayOrders ? String(todayOrders.length) : pending}
          note={todayOrders ? "Recebidos desde a meia-noite" : pendingNote}
        />
        <KpiCard
          label="A receber"
          value={receivable != null ? formatPrice(receivable) : pending}
          note={receivable != null ? "Pagos, ainda não enviados" : pendingNote}
        />
        <KpiCard
          label="Fila de impressão"
          value={queue ? String(queue.length) : pending}
          note={queue ? "Peças em produção agora" : pendingNote}
        />
        <KpiCard
          label="Estoque crítico"
          value={loading ? "…" : String(lowStock.length)}
          note={
            lowStock.length
              ? lowStock
                  .slice(0, 2)
                  .map((product) => product.name)
                  .join(", ")
              : "Nenhuma peça abaixo de 4 unidades"
          }
          tone={lowStock.length ? "alert" : "positive"}
        />
      </div>

      <div className="mt-9 flex flex-wrap gap-4 lg:gap-8">
        <section className="min-w-[280px] flex-1 basis-[min(100%,420px)]">
          <div className="flex items-baseline justify-between gap-3 border-b border-border-strong pb-3">
            <h2 className="font-display text-heading-3">Fila de impressão</h2>
            <Link
              href="/admin/pedidos"
              className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-accent"
            >
              Ver pedidos
            </Link>
          </div>

          {queue === null ? (
            <p className="py-6 text-body-small text-tertiary">
              A fila aparece aqui assim que a API expuser os pedidos.
            </p>
          ) : queue.length === 0 ? (
            <p className="py-6 text-body-small text-tertiary">
              Nenhuma peça na máquina agora.
            </p>
          ) : (
            queue.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center gap-3.5 border-b border-border-subtle py-3.5"
              >
                <div className="relative size-[46px] shrink-0 overflow-hidden bg-surface-muted">
                  {entry.image && (
                    <Image
                      src={entry.image}
                      alt=""
                      fill
                      sizes="46px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{entry.name}</div>
                  <div className="text-[13px] text-tertiary">
                    {entry.orderId} · {entry.variant}
                  </div>
                </div>
                <div className="w-[92px] shrink-0">
                  <div className="h-1 bg-primary/10">
                    <div
                      className="h-1 bg-clay"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11.5px] tabular-nums text-tertiary">
                    {entry.progress}%
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="min-w-[260px] flex-1 basis-[min(100%,320px)]">
          <div className="border-b border-border-strong pb-3">
            <h2 className="font-display text-heading-3">Precisa de você</h2>
          </div>

          {loading ? (
            <p className="py-6 text-body-small text-tertiary">Carregando…</p>
          ) : alerts.length === 0 ? (
            <p className="py-6 text-body-small text-tertiary">
              Nada pendente. Bom dia de trabalho.
            </p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.key}
                className="flex gap-3 border-b border-border-subtle py-3.5"
              >
                <span
                  aria-hidden
                  className={`mt-2 size-[7px] shrink-0 rounded-full ${
                    alert.tone === "alert" ? "bg-clay" : "bg-accent"
                  }`}
                />
                <div>
                  <div className="font-semibold">{alert.title}</div>
                  <div className="text-[13.5px] text-secondary">
                    {alert.text}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
