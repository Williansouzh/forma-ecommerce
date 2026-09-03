"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Product, ProductStatus } from "@/types/product";
import type { ProductVariant } from "@/types/product";
import { Button } from "@/components/ui/button";
import { ColorSelector } from "@/components/ui/color-selector";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { ShippingEstimator } from "@/components/shared/shipping-estimator";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/utils";

/** Disponibilidade em prosa, não em badge colorida. */
const availability: Record<ProductStatus, string> = {
  in_stock: "Pronto para enviar",
  low_stock: "Restam poucas peças",
  made_to_order: "Feito depois do seu pedido",
  sold_out: "Esgotado por enquanto",
};

function resolveStatus(product: Product): ProductStatus {
  if (!product.isAvailable) return "sold_out";
  if (typeof product.stock === "number" && product.stock === 0) return "sold_out";
  if (product.price === 0) return "made_to_order";
  const variants = product.variants ?? [];
  const totalVariantStock = variants.reduce(
    (acc, variant) => acc + variant.stock,
    0
  );
  if (variants.length > 0 && totalVariantStock <= 6) return "low_stock";
  return "in_stock";
}

export function ProductDetails({ product }: { product: Product }) {
  const [variant, setVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useUIStore((state) => state.openCart);
  const pushToast = useUIStore((state) => state.pushToast);

  const status = resolveStatus(product);
  const unitPrice =
    product.price === 0 ? 0 : product.price + (variant?.priceAdjustment ?? 0);
  const isKeychain = product.tags.some((tag) =>
    tag.toLowerCase().includes("chaveiro")
  );

  const finishNote = product.material?.toLowerCase().includes("resina")
    ? "A resina deixa a superfície lisa e o detalhe fino — dá para ver o desenho de perto."
    : "Tem linha de camada, sim. É assim que se sabe que foi feito e não fabricado.";

  const statusLine =
    status === "made_to_order" && typeof product.productionTime === "number"
      ? `${availability[status]} — ${product.productionTime} dias`
      : availability[status];

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
    });
    pushToast(`${product.name} — no carrinho`);
    openCart();
  };

  return (
    <div>
      <h1 className="font-display text-heading-1">{product.name}</h1>

      {/* Preço em serifa. Preço em monoespaçada parece cotação de API. */}
      <div className="mt-5 flex flex-wrap items-baseline gap-4">
        <motion.p
          key={unitPrice}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="font-display text-heading-2 tabular-nums"
        >
          {product.price === 0 ? "Sob consulta" : formatPrice(unitPrice)}
        </motion.p>
        {product.originalPrice && (
          <span className="text-body tabular-nums text-tertiary line-through">
            {formatPrice(product.originalPrice)}
          </span>
        )}
      </div>

      <p className="mt-2 text-body-small italic text-accent">{statusLine}</p>

      {/* Por que a peça existe vem antes de qualquer milímetro. */}
      <p className="mt-8 max-w-prose text-body-large text-secondary">
        {product.shortDescription}
      </p>

      <p className="mt-4 max-w-prose text-body-small italic text-tertiary">
        {finishNote}
      </p>

      <div className="mt-12 space-y-9">
        {(product.variants?.length ?? 0) > 0 && (
          <ColorSelector
            variants={product.variants ?? []}
            selected={variant}
            onSelect={(selected) => {
              setVariant(selected);
              setQuantity(1);
            }}
          />
        )}

        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          max={Math.min(99, Math.max(1, product.stock ?? 99))}
        />

        <Button
          size="xl"
          onClick={addToCart}
          disabled={status === "sold_out"}
          className="w-full sm:w-auto"
        >
          {status === "sold_out"
            ? "Esgotado"
            : unitPrice === 0
              ? "Pedir um orçamento"
              : `Adicionar — ${formatPrice(unitPrice * quantity)}`}
        </Button>

        <ShippingEstimator subtotal={unitPrice * quantity} />
      </div>

      <p className="mt-10 max-w-md text-body-small text-tertiary">
        {isKeychain
          ? "Vai com argola presa e embalado para presente."
          : "Embalado com proteção reforçada."}{" "}
        Evite deixar a peça em carro fechado, sol forte ou perto de fonte de
        calor.
      </p>

      {/* Ficha discreta, no fim, sem réguas de accent e sem monoespaçada. */}
      <dl className="mt-14 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-border-strong pt-8 text-body-small sm:grid-cols-3">
        {product.material && (
          <div>
            <dt className="label text-tertiary">Material</dt>
            <dd className="mt-1.5 text-secondary">{product.material}</dd>
          </div>
        )}
        {product.dimensions && (
          <div>
            <dt className="label text-tertiary">Tamanho</dt>
            <dd className="mt-1.5 tabular-nums text-secondary">
              {product.dimensions.width} × {product.dimensions.depth} ×{" "}
              {product.dimensions.height} mm
            </dd>
          </div>
        )}
        {typeof product.weight === "number" && (
          <div>
            <dt className="label text-tertiary">Peso</dt>
            <dd className="mt-1.5 tabular-nums text-secondary">
              {product.weight} g
            </dd>
          </div>
        )}
        {typeof product.productionTime === "number" && (
          <div>
            <dt className="label text-tertiary">Produção</dt>
            <dd className="mt-1.5 text-secondary">
              até {product.productionTime} dias úteis
            </dd>
          </div>
        )}
        <div>
          <dt className="label text-tertiary">Acabamento</dt>
          <dd className="mt-1.5 text-secondary">conferido à mão</dd>
        </div>
        <div>
          <dt className="label text-tertiary">Cuidados</dt>
          <dd className="mt-1.5 text-secondary">longe do calor</dd>
        </div>
      </dl>

      <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2" aria-label="Tags do produto">
        {product.tags.map((tag) => (
          <li key={tag} className="text-body-small italic text-tertiary">
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}
