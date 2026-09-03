"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2, X } from "lucide-react";
import {
  useCartStore,
  getCartTotals,
} from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { ShippingEstimator } from "@/components/shared/shipping-estimator";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

export function CartDrawer() {
  const router = useRouter();
  const cartOpen = useUIStore((state) => state.cartOpen);
  const closeCart = useUIStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const totals = getCartTotals(items);

  const freeShippingProgress = Math.min(
    (totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100,
    100
  );
  const missingForFreeShipping = FREE_SHIPPING_THRESHOLD - totals.subtotal;

  const goToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            className="fixed inset-0 z-[70] bg-black/50"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho de compras"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
            className="fixed right-0 top-0 z-[80] flex h-dvh w-full max-w-[420px] flex-col border-l border-primary bg-surface shadow-[-8px_0_0_rgba(17,17,17,0.08)]"
          >
            <div className="flex items-center justify-between border-b border-primary px-6 py-5">
              <h2 className="font-display text-heading-3">
                Carrinho{" "}
                <span className="text-body-small text-tertiary">
                  ({totals.count} {totals.count === 1 ? "item" : "itens"})
                </span>
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Fechar carrinho"
                className="flex size-10 items-center justify-center border border-border-subtle text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                <X size={20} />
              </button>
            </div>

            {!hasHydrated ? null : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="flex size-16 items-center justify-center border border-primary bg-surface-muted text-tertiary">
                  <ShoppingBag size={26} />
                </span>
                <p className="font-display text-heading-3">Seu carrinho está vazio</p>
                <p className="text-body-small text-secondary">
                  Comece por chaveiros, decoração ou uma peça sob medida.
                </p>
                <Link
                  href="/colecoes"
                  onClick={closeCart}
                  className="mt-2 inline-flex h-11 items-center border border-primary bg-primary px-6 label text-background transition-colors hover:bg-transparent hover:text-primary"
                >
                  Explorar coleções
                </Link>
              </div>
            ) : (
              <>
                <div className="border-b border-primary px-6 py-4">
                  {missingForFreeShipping > 0 ? (
                    <p className="text-caption uppercase text-secondary">
                      Faltam{" "}
                      <span className="text-accent">
                        {formatPrice(missingForFreeShipping)}
                      </span>{" "}
                      para frete grátis
                    </p>
                  ) : (
                    <p className="text-caption uppercase text-success">
                      Você ganhou frete grátis
                    </p>
                  )}
                  <div className="mt-2 h-1 overflow-hidden bg-surface-muted">
                    <motion.div
                      className="h-full bg-accent"
                      initial={false}
                      animate={{ width: `${freeShippingProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <ul className="mt-4 grid gap-2 text-caption text-tertiary">
                    <li className="flex items-center gap-2">
                      <span className="h-px w-4 bg-accent" aria-hidden />
                      Produção começa após confirmação do pagamento.
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-px w-4 bg-accent" aria-hidden />
                      Embalagem protegida e pronta para presente.
                    </li>
                  </ul>
                </div>

                <ul className="flex-1 divide-y divide-border-subtle overflow-y-auto px-6">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={`${item.productId}-${item.variantId ?? "default"}`}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: -24 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-4 py-5"
                      >
                        <div className="relative size-20 shrink-0 overflow-hidden border border-primary bg-surface-muted">
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.name ?? ""}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/produto/${item.slug}`}
                              onClick={closeCart}
                              className="truncate text-body-small font-medium text-primary hover:text-accent"
                            >
                              {item.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(item.productId, item.variantId)
                              }
                              aria-label={`Remover ${item.name}`}
                              className="shrink-0 text-tertiary transition-colors hover:text-error"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {item.variantName && (
                            <p className="mt-0.5 text-micro uppercase text-tertiary">
                              {item.variantName}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="inline-flex items-center border border-primary">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.variantId,
                                    item.quantity - 1
                                  )
                                }
                                aria-label="Diminuir quantidade"
                                className="flex size-8 items-center justify-center text-secondary hover:text-primary"
                              >
                                −
                              </button>
                              <span className="w-7 text-center text-micro tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.variantId,
                                    item.quantity + 1
                                  )
                                }
                                aria-label="Aumentar quantidade"
                                className="flex size-8 items-center justify-center text-secondary hover:text-primary"
                              >
                                +
                              </button>
                            </div>
                            <p className="text-body-small font-medium tabular-nums">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="space-y-2 border-t border-primary px-6 py-5">
                  <div className="flex justify-between text-body-small text-secondary">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPrice(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-body-small text-secondary">
                    <span>Frete</span>
                    <span className="tabular-nums">
                      {totals.shipping === 0 ? "Grátis" : formatPrice(totals.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border-subtle pt-3 text-heading-3">
                    <span>Total</span>
                    <span className="tabular-nums">{formatPrice(totals.total)}</span>
                  </div>
                  <ShippingEstimator subtotal={totals.subtotal} compact />
                  <button
                    type="button"
                    onClick={goToCheckout}
                    className="mt-3 flex h-13 w-full items-center justify-center border border-primary bg-primary py-3.5 label text-background transition-all hover:bg-transparent hover:text-primary"
                  >
                    Finalizar compra
                  </button>
                  <p className="text-center text-micro uppercase tracking-[0.08em] text-tertiary">
                    Pagamento seguro · troca por defeito de fabricação
                  </p>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="flex w-full items-center justify-center py-2 text-body-small text-secondary underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    Continuar comprando
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
