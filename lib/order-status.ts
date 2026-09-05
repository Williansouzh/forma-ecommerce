import type { OrderStatus } from "@/types/order";

/** O rótulo que o ateliê usa para cada estágio, na ordem do fluxo. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Na fila",
  printing: "Imprimindo",
  finishing: "Acabamento",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

/** Estágios em que a peça está na mão do ateliê — a fila de impressão. */
export const QUEUE_STATUSES: OrderStatus[] = [
  "processing",
  "printing",
  "finishing",
];

/** Filtros da tela de Pedidos, na ordem do desenho. */
export const ORDER_FILTERS: { id: OrderStatus | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "paid", label: "Pago" },
  { id: "processing", label: "Na fila" },
  { id: "printing", label: "Imprimindo" },
  { id: "finishing", label: "Acabamento" },
  { id: "shipped", label: "Enviado" },
];

/** Opções do seletor de status de cada linha. */
export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "printing",
  "finishing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Um pedido só sai da conta de "pendente" quando despacha. */
export function isPending(status: OrderStatus): boolean {
  return status !== "shipped" && status !== "delivered" && status !== "cancelled";
}

export function whatsappLink(phone: string, code: string): string {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(`Oi! Sobre o seu pedido ${code} na c3dcriativ:`);
  return `https://wa.me/${digits}?text=${text}`;
}
