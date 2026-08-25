import type { CartItem, CartTotals } from "@/types/cart";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/lib/constants";

export function getCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  return {
    subtotal,
    shipping,
    discount: 0,
    total: subtotal + shipping,
    count: items.reduce((acc, item) => acc + item.quantity, 0),
  };
}
