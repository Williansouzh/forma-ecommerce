"use client";

import { useState } from "react";
import type { Product, ProductVariant } from "@/types/product";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/utils";
import { WHATSAPP_URL } from "@/lib/constants";

/**
 * A coluna que decide a compra. A ordem é a do handoff e não é arbitrária:
 * categoria, nome, preço, o que é a peça, quando chega, em que cor, quantas —
 * e só então o botão. A ficha técnica fica por último porque é conferência,
 * não argumento.
 */
export function ProductDetails({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  const [variant, setVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useUIStore((state) => state.openCart);
  const pushToast = useUIStore((state) => state.pushToast);

  const soldOut =
    !product.isAvailable ||
    product.stock === 0 ||
    (variant?.stock !== undefined && variant.stock === 0);
  const unitPrice =
    product.price === 0 ? 0 : product.price + (variant?.priceAdjustment ?? 0);

  const days = product.productionTime;
  const remaining = variant?.stock ?? product.stock;
  const availLong = soldOut
    ? "Esgotada por enquanto — dá para avisar quando voltar à fila."
    : typeof remaining === "number" && remaining > 0 && remaining <= 3
      ? `Restam ${remaining} ${remaining === 1 ? "unidade" : "unidades"} desta cor — depois volta para a fila de produção.`
      : typeof days === "number"
        ? product.category === "personalizados"
          ? `Feita depois do seu pedido e enviada em ${days} dias úteis.`
          : `Impressa depois do seu pedido e enviada em ${days} dias úteis.`
        : "Produzida sob encomenda.";

  /** Três parcelas é o que a loja anuncia no checkout; o card repete o mesmo. */
  const installment = unitPrice > 0 ? Math.round(unitPrice / 3) : 0;

  const specs: [string, string][] = [
    ["Material", product.material ?? "—"],
    [
      "Dimensões",
      product.dimensions
        ? `${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} mm`
        : "—",
    ],
    ["Peso", typeof product.weight === "number" ? `${product.weight} g` : "—"],
    ["Altura de camada", "0,12 mm"],
    [
      "Produção",
      typeof days === "number" ? `${days} dias úteis` : "Sob consulta",
    ],
    ["Acabamento", "Lixado e conferido à mão"],
  ];

  const addToCart = () => {
    if (unitPrice === 0) {
      pushToast(
        "Peça sob consulta — peça um orçamento na página de encomendas",
        "info"
      );
      return;
    }
    addItem({
      productId: product.id,
      variantId: variant?.id,
      quantity,
      price: unitPrice,
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url,
      variantName: variant?.name,
      productionTime: product.productionTime,
    });
    pushToast(`${product.name} — no carrinho`);
    openCart();
  };

  const maxQuantity = Math.min(99, Math.max(1, remaining ?? 99));

  return (
    <div className="min-w-[280px] flex-[1_1_min(100%,380px)] self-start lg:sticky lg:top-[100px]">
      {categoryName && <span className="label text-tertiary">{categoryName}</span>}

      <h1 className="mt-3.5 font-display text-[clamp(32px,4.4vw,56px)] font-light leading-[1.02] tracking-[-0.025em]">
        {product.name}
      </h1>

      <div className="mt-[18px] flex flex-wrap items-baseline gap-3.5">
        <span className="text-[26px] font-semibold tabular-nums">
          {product.price === 0 ? "Sob consulta" : formatPrice(unitPrice)}
        </span>
        {installment > 0 && (
          <span className="text-[13.5px] text-tertiary">
            ou 3× de {formatPrice(installment)} sem juros
          </span>
        )}
      </div>

      <p className="mt-5 text-body text-pretty text-secondary">
        {product.shortDescription}
      </p>

      {/* A caixa areia isola o prazo do resto: é o que a pessoa volta para reler. */}
      <p className="mt-[18px] bg-surface-muted px-3.5 py-3 text-body-small text-primary">
        {availLong}
      </p>

      {(product.variants?.length ?? 0) > 0 && (
        <div className="mt-7">
          <span className="label text-tertiary">Cor do filamento</span>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {product.variants?.map((option) => {
              const active = option.id === variant?.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setVariant(option);
                    setQuantity(1);
                  }}
                  aria-pressed={active}
                  className={`flex min-h-11 items-center gap-[9px] rounded-md border py-0 pl-2.5 pr-3.5 text-[13px] transition-colors ${
                    active
                      ? "border-primary"
                      : "border-border-strong hover:border-accent"
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-[18px] rounded-full border border-border-strong"
                    style={{ background: option.colorHex }}
                  />
                  {option.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-[26px] flex flex-wrap gap-3">
        <div className="flex items-center rounded-md border border-border-strong">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Diminuir quantidade"
            disabled={quantity <= 1}
            className="h-[54px] w-[46px] text-lg disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-8 text-center text-[15px] font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
            aria-label="Aumentar quantidade"
            disabled={quantity >= maxQuantity}
            className="h-[54px] w-[46px] text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut}
          className="min-h-[54px] flex-[1_1_200px] rounded-md bg-primary px-6 text-[14px] font-semibold tracking-[0.02em] text-background transition-colors duration-300 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {soldOut
            ? "Esgotado"
            : unitPrice === 0
              ? "Pedir um orçamento"
              : "Adicionar à sacola"}
        </button>
      </div>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3.5 inline-flex items-center gap-2 border-b border-accent/40 pb-0.5 text-[13.5px] font-semibold text-primary transition-colors hover:border-accent hover:text-accent"
      >
        Prefiro fechar no WhatsApp
      </a>

      <dl className="mt-[34px] border-t border-border-strong pt-2">
        {specs.map(([term, value]) => (
          <div
            key={term}
            className="flex justify-between gap-[18px] border-b border-border-subtle py-[13px]"
          >
            <dt className="text-body-small uppercase tracking-[0.1em] text-tertiary">
              {term}
            </dt>
            <dd className="text-right text-[14.5px] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
