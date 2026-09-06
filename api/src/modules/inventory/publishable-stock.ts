/**
 * A função central do enunciado, e o único lugar que decide o número que sai
 * daqui para qualquer canal externo:
 *
 *     estoquePublicável = máximo(0, estoqueDisponível − margemDeSegurança)
 *
 * Está isolada em um arquivo sem dependência de Nest, Mongo ou Shopee porque
 * ela vale para qualquer canal que venha depois — e porque assim o teste da
 * margem de segurança não precisa de banco.
 */

/** Os quatro números que o domínio distingue, para um SKU. */
export interface StockSnapshot {
  /** Físico na prateleira, reservado ou não. */
  onHand: number;
  /** Comprometido com um checkout ou pedido ainda não confirmado. */
  reserved: number;
  /** Físico preso em lote vencido: existe, mas não pode ser vendido. */
  expired: number;
}

/**
 * Disponível para vender AGORA: tira do físico o que está comprometido e o
 * que venceu. Nunca negativo — saldo negativo não é informação, é defeito.
 */
export function availableStock(snapshot: StockSnapshot): number {
  return Math.max(0, snapshot.onHand - snapshot.reserved - snapshot.expired);
}

/**
 * O que pode ser anunciado em um canal externo.
 *
 * A margem existe porque o canal externo demora a saber: entre a venda no
 * site e o `update_stock` chegar na Shopee há uma janela em que os dois lados
 * acreditam ter a peça. Segurar N unidades encolhe essa janela para o
 * comprador em vez de para o vendedor.
 *
 * Margem negativa seria vender o que não existe: tratada como zero.
 */
export function publishableStock(
  snapshot: StockSnapshot,
  safetyMargin: number,
): number {
  const margin = Number.isFinite(safetyMargin) ? Math.max(0, Math.trunc(safetyMargin)) : 0;
  return Math.max(0, availableStock(snapshot) - margin);
}
