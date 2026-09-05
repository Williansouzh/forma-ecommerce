import type { CartItem, CartTotals } from "@/types/cart";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/lib/constants";

/**
 * `freeShippingThreshold` vem das configurações do ateliê quando quem chama
 * consegue lê-las no servidor; no cliente, a constante segue valendo.
 */
export function getCartTotals(
  items: CartItem[],
  freeShippingThreshold: number = FREE_SHIPPING_THRESHOLD
): CartTotals {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const shipping =
    subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : SHIPPING_COST;
  return {
    subtotal,
    shipping,
    discount: 0,
    total: subtotal + shipping,
    count: items.reduce((acc, item) => acc + item.quantity, 0),
  };
}

/**
 * O total que a pessoa paga, já com o desconto do Pix.
 *
 * Vive aqui porque o resumo do pedido e o botão de confirmar precisam dizer o
 * mesmo número — calculado em dois lugares, um dia divergem.
 */
export function payableTotal(totals: CartTotals, pixDiscount = 0): number {
  return totals.total - Math.round(totals.subtotal * pixDiscount);
}
