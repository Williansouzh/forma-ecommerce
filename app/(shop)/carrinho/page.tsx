"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Trash2 } from "lucide-react";
import {
  useCartStore,
  getCartTotals,
} from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { ProductCard } from "@/components/product/product-card";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = getCartTotals(items);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/products?featured=1&limit=6")
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Product[]) => {
        if (active) setRecommendations(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const suggestions = recommendations
    .filter((product) => !items.some((item) => item.productId === product.id))
    .slice(0, 3);

  return (
    <div className="shell pb-24 pt-28 md:pt-36">
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: "Carrinho" }]}
      />

      <h1 className="font-display text-display-2 tracking-tight">
        Carrinho{" "}
        <span className="text-body-large text-tertiary">
          ({totals.count} {totals.count === 1 ? "item" : "itens"})
        </span>
      </h1>

      {!hasHydrated ? null : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 rounded-xl border border-dashed border-strong py-24 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-muted text-tertiary">
            <ShoppingBag size={26} />
          </span>
          <p className="font-display text-heading-3">Seu carrinho está vazio</p>
          <p className="max-w-sm text-body-small text-secondary">
            Explore as coleções e encontre a peça que faltava no seu espaço.
          </p>
          <Link
            href="/colecoes"
            className="mt-2 inline-flex h-12 items-center rounded-md bg-accent px-8 text-body-small font-medium text-white transition-colors hover:bg-accent-dark"
          >
            Explorar coleções
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
            <ul className="divide-y divide-border-subtle border-y border-border-subtle">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={`${item.productId}-${item.variantId ?? "default"}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center"
                  >
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-muted">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name ?? ""}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        href={`/produto/${item.slug}`}
                        className="font-display text-heading-3 hover:text-accent"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-caption uppercase text-tertiary">
                          {item.variantName}
                        </p>
                      )}
                      <p className="font-mono text-body-small tabular-nums text-secondary">
                        {formatPrice(item.price)} / unidade
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <div className="inline-flex h-11 items-center rounded-md border border-strong">
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
                          className="flex h-full w-10 items-center justify-center text-secondary transition-colors hover:text-primary"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-mono text-body-small tabular-nums">
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
                          className="flex h-full w-10 items-center justify-center text-secondary transition-colors hover:text-primary"
                        >
                          +
                        </button>
                      </div>
                      <p className="w-24 text-right font-mono font-medium tabular-nums">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.variantId)}
                        aria-label={`Remover ${item.name}`}
                        className="flex size-10 items-center justify-center text-tertiary transition-colors hover:text-error"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <aside
              aria-label="Resumo do pedido"
              className="h-fit rounded-lg border bg-surface p-6 lg:sticky lg:top-28"
            >
              <h2 className="font-display text-heading-3">Resumo</h2>
              <dl className="mt-5 space-y-2.5 text-body-small">
                <div className="flex justify-between text-secondary">
                  <dt>Subtotal</dt>
                  <dd className="font-mono tabular-nums">{formatPrice(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-secondary">
                  <dt>Frete</dt>
                  <dd className="font-mono tabular-nums">
                    {totals.shipping === 0 ? "Grátis" : formatPrice(totals.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border-subtle pt-4 font-mono text-heading-3">
                  <dt>Total</dt>
                  <dd className="tabular-nums font-mono">{formatPrice(totals.total)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                className="mt-6 flex h-13 w-full items-center justify-center rounded-md bg-accent py-3.5 text-body font-medium text-white transition-all hover:-translate-y-px hover:bg-accent-dark active:scale-[0.98]"
              >
                Finalizar compra
              </Link>
              <Link
                href="/colecoes"
                className="mt-3 flex w-full items-center justify-center py-2 text-body-small text-secondary underline-offset-4 hover:text-primary hover:underline"
              >
                Continuar comprando
              </Link>
            </aside>
          </div>

          {suggestions.length > 0 && (
            <section aria-labelledby="rec-titulo" className="mt-20">
              <h2 id="rec-titulo" className="font-display text-heading-2 tracking-tight">
                Combina com o seu pedido
              </h2>
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {suggestions.map((product) => (
                  <ProductCard key={product.id} product={product} variant="medium" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
