import type { OrderStatus } from "../orders/schemas/order.schema";

/**
 * Os status que a Shopee usa em `order_status`. Fonte: parâmetro
 * `order_status` de `v2.order.get_order_list` e o campo de mesmo nome em
 * `get_order_detail`.
 */
export const SHOPEE_ORDER_STATUSES = [
  "UNPAID",
  "READY_TO_SHIP",
  "PROCESSED",
  "RETRY_SHIP",
  "SHIPPED",
  "TO_CONFIRM_RECEIVE",
  "COMPLETED",
  "IN_CANCEL",
  "CANCELLED",
  "TO_RETURN",
  "INVOICE_PENDING",
] as const;
export type ShopeeOrderStatus = (typeof SHOPEE_ORDER_STATUSES)[number];

/**
 * O efeito de cada status sobre o estoque. É ESTE enum — e não o status da
 * Shopee espalhado por ifs — que o serviço de pedidos consulta.
 *
 * A pergunta que ele responde não é "em que estágio está", é "o que o estoque
 * deve fazer agora". Dois status diferentes podem pedir a mesma coisa, e é
 * bom que peçam pelo mesmo nome.
 */
export const STOCK_EFFECTS = [
  /** Segura o estoque; ainda não é venda. */
  "reserve",
  /** A venda vale: baixa o físico pelo FEFO. */
  "confirm",
  /** Devolve a reserva ao disponível; não havia baixa ainda. */
  "release",
  /** Desfaz uma baixa já feita: a peça volta ao estoque. */
  "restock",
  /** Nada muda no estoque. */
  "none",
] as const;
export type StockEffect = (typeof STOCK_EFFECTS)[number];

export interface StatusMapping {
  /** Status interno equivalente, para o painel de Pedidos. */
  internal: OrderStatus;
  effect: StockEffect;
  /** Por que este efeito, em uma linha — vale no log e no painel. */
  note: string;
}

/**
 * O mapeamento explícito que o enunciado pede, em um lugar só.
 *
 * A decisão que importa: **a baixa acontece em `READY_TO_SHIP`**, não em
 * `COMPLETED`. `READY_TO_SHIP` é o primeiro estado em que a Shopee garante o
 * pagamento e libera o envio — daí em diante a peça é do comprador. Esperar
 * `COMPLETED` (que só chega depois de o prazo de devolução vencer, semanas
 * depois) deixaria o estoque anunciando peça que já saiu da prateleira.
 *
 * Os estados seguintes (`PROCESSED`, `SHIPPED`, `TO_CONFIRM_RECEIVE`,
 * `COMPLETED`) são `none` de propósito: a baixa já ocorreu, e repeti-la seria
 * o defeito que o enunciado chama de "baixar estoque duas vezes quando o
 * pedido mudar de status". A idempotência não depende só disto — a transição
 * `held → consumed` da reserva também protege —, mas as duas travas juntas
 * significam que nem um mapeamento errado nem um evento repetido baixam duas.
 */
export const SHOPEE_STATUS_MAP: Record<ShopeeOrderStatus, StatusMapping> = {
  UNPAID: {
    internal: "pending",
    effect: "reserve",
    note: "Pedido criado, pagamento pendente: estoque comprometido, não baixado.",
  },
  INVOICE_PENDING: {
    internal: "pending",
    effect: "reserve",
    note: "Aguardando dados de nota fiscal; o estoque segue comprometido.",
  },
  READY_TO_SHIP: {
    internal: "paid",
    effect: "confirm",
    note: "Pagamento garantido pela Shopee: é aqui que a venda baixa o estoque (FEFO).",
  },
  RETRY_SHIP: {
    internal: "paid",
    effect: "confirm",
    note: "Reenvio após falha de coleta; a venda continua valendo.",
  },
  PROCESSED: {
    internal: "processing",
    effect: "none",
    note: "Já baixado em READY_TO_SHIP; mudar de estágio não mexe no estoque.",
  },
  SHIPPED: {
    internal: "shipped",
    effect: "none",
    note: "Já baixado; despacho não altera saldo.",
  },
  TO_CONFIRM_RECEIVE: {
    internal: "shipped",
    effect: "none",
    note: "Em trânsito, aguardando confirmação do comprador.",
  },
  COMPLETED: {
    internal: "delivered",
    effect: "none",
    note: "Concluído; a baixa ocorreu semanas antes.",
  },
  IN_CANCEL: {
    internal: "paid",
    effect: "none",
    note: "Cancelamento SOLICITADO e ainda não aceito: nada muda até virar CANCELLED.",
  },
  CANCELLED: {
    internal: "cancelled",
    effect: "release",
    note: "Cancelado: solta a reserva ou devolve ao estoque, conforme já tenha baixado.",
  },
  TO_RETURN: {
    internal: "cancelled",
    effect: "restock",
    note: "Devolução aceita: a peça volta ao estoque como lote novo.",
  },
};

export function isShopeeOrderStatus(value: string): value is ShopeeOrderStatus {
  return (SHOPEE_ORDER_STATUSES as readonly string[]).includes(value);
}

export function mapShopeeStatus(value: string): StatusMapping | null {
  return isShopeeOrderStatus(value) ? SHOPEE_STATUS_MAP[value] : null;
}

/**
 * Ordena os estados no ciclo de vida, para descartar evento fora de ordem.
 *
 * A Shopee não garante ordem de entrega dos pushes, e a rede menos ainda: um
 * push de `READY_TO_SHIP` pode chegar DEPOIS do de `SHIPPED`. Sem esta régua,
 * o pedido voltaria de "enviado" para "pago" e o `confirm` tentaria baixar um
 * estoque já baixado.
 *
 * Cancelamento e devolução ficam FORA da régua (posição -1): eles podem
 * chegar em qualquer momento e precisam ser aceitos mesmo depois de um estado
 * mais avançado. Quem protege contra repetição ali é a reserva, não a ordem.
 */
const LIFECYCLE_RANK: Record<ShopeeOrderStatus, number> = {
  UNPAID: 0,
  INVOICE_PENDING: 0,
  READY_TO_SHIP: 1,
  RETRY_SHIP: 1,
  PROCESSED: 2,
  SHIPPED: 3,
  TO_CONFIRM_RECEIVE: 4,
  COMPLETED: 5,
  IN_CANCEL: -1,
  CANCELLED: -1,
  TO_RETURN: -1,
};

export function lifecycleRank(status: ShopeeOrderStatus): number {
  return LIFECYCLE_RANK[status];
}

/** A partir daqui a venda vale e o estoque já deveria ter baixado. */
const CONFIRM_RANK = LIFECYCLE_RANK.READY_TO_SHIP;

/**
 * O efeito para um pedido visto pela PRIMEIRA vez.
 *
 * `SHIPPED` (e os outros posteriores) são `none` no mapa porque, no ciclo
 * normal, a baixa já aconteceu em `READY_TO_SHIP`. Mas um pedido pode chegar
 * aqui já enviado: o push de `READY_TO_SHIP` se perdeu, a varredura pegou o
 * pedido tarde, ou ele é anterior à integração.
 *
 * Sem esta correção, esse pedido criaria a venda no painel e NUNCA baixaria o
 * estoque — e o pior é que não se corrigiria sozinho: a conciliação compara o
 * saldo central com o da Shopee e empurra o central, então ela propagaria o
 * número inflado em vez de consertá-lo.
 *
 * Baixar aqui é seguro porque a idempotência não depende deste cálculo: a
 * transição `held → consumed` da reserva continua garantindo uma baixa só,
 * mesmo que o `READY_TO_SHIP` atrasado chegue depois.
 */
export function effectOnFirstSight(status: ShopeeOrderStatus): StockEffect {
  const mapping = SHOPEE_STATUS_MAP[status];
  if (mapping.effect !== "none") return mapping.effect;
  return lifecycleRank(status) >= CONFIRM_RANK ? "confirm" : "none";
}

/**
 * Devolve `true` quando o status recebido é ANTERIOR ao que já registramos —
 * ou seja, quando o evento chegou atrasado e deve ser ignorado.
 */
export function isStaleTransition(
  current: ShopeeOrderStatus | undefined,
  incoming: ShopeeOrderStatus,
): boolean {
  if (!current) return false;
  const incomingRank = lifecycleRank(incoming);
  const currentRank = lifecycleRank(current);
  // Terminais fora da régua nunca são "atrasados": um cancelamento vale
  // mesmo chegando depois de SHIPPED.
  if (incomingRank < 0) return false;
  // Já estamos em um terminal: um evento do ciclo normal chegou tarde demais.
  if (currentRank < 0) return true;
  return incomingRank < currentRank;
}
