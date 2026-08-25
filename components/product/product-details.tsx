"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Package, Ruler, ShoppingBag, Star, Weight } from "lucide-react";
import type { Product, ProductStatus } from "@/types/product";
import type { ProductVariant } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorSelector } from "@/components/ui/color-selector";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/utils";

const statusConfig: Record<
  ProductStatus,
  { label: string; variant: "success" | "warning" | "accent" | "error" }
> = {
  in_stock: { label: "Em estoque", variant: "success" },
  low_stock: { label: "Últimas unidades", variant: "warning" },
  made_to_order: { label: "Sob encomenda", variant: "accent" },
  sold_out: { label: "Esgotado", variant: "error" },
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
  const config = statusConfig[status];
  const unitPrice =
    product.price === 0 ? 0 : product.price + (variant?.priceAdjustment ?? 0);

  const addToCart = () => {
    if (unitPrice === 0) {
      pushToast(
        "Peça sob consulta — solicite um orçamento na página de personalizados",
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
    pushToast(`${product.name} adicionado ao carrinho`);
    openCart();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={config.variant}>{config.label}</Badge>
        {product.badge && <Badge variant="muted">{product.badge}</Badge>}
      </div>

      <h1 className="mt-4 font-display text-heading-1 tracking-tight">
        {product.name}
      </h1>

      <div className="mt-3 flex items-center gap-3">
        <motion.p
          key={unitPrice}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-mono text-heading-2 font-medium tabular-nums"
        >
          {product.price === 0 ? (
            <span className="text-body-large text-secondary">Sob consulta</span>
          ) : (
            formatPrice(unitPrice)
          )}
        </motion.p>
        {product.originalPrice && (
          <span className="font-mono text-body tabular-nums text-quaternary line-through">
            {formatPrice(product.originalPrice)}
          </span>
        )}
      </div>

      <p className="mt-5 max-w-prose text-body-large text-secondary">
        {product.shortDescription}
      </p>

      {typeof product.rating === "number" && (
        <div className="mt-8 flex items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden>
            {[...Array(5)].map((_, index) => (
              <Star
                key={index}
                size={15}
                className={
                  index < Math.round(product.rating!)
                    ? "fill-accent text-accent"
                    : "text-quaternary"
                }
              />
            ))}
          </span>
          <span className="text-body-small font-medium">{product.rating.toFixed(1)}</span>
          {typeof product.reviewCount === "number" && (
            <span className="text-body-small text-tertiary">
              ({product.reviewCount} avaliações)
            </span>
          )}
        </div>
      )}

      <hr className="my-8 border-border-subtle" />

      <div className="space-y-8">
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
          <ShoppingBag size={18} />
          {status === "sold_out"
            ? "Produto esgotado"
            : unitPrice === 0
              ? "Solicitar orçamento"
              : `Adicionar ao carrinho — ${formatPrice(unitPrice * quantity)}`}
        </Button>
      </div>

      <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 rounded-lg bg-surface-muted p-6 sm:grid-cols-2">
        {typeof product.productionTime === "number" && (
          <div className="flex items-start gap-3">
            <Clock size={17} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <dt className="text-micro uppercase text-tertiary">Produção</dt>
              <dd className="font-mono text-body-small">
                Até {product.productionTime} dias úteis
              </dd>
            </div>
          </div>
        )}
        {product.dimensions && (
          <div className="flex items-start gap-3">
            <Ruler size={17} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <dt className="text-micro uppercase text-tertiary">Dimensões</dt>
              <dd className="font-mono text-body-small">
                {product.dimensions.width} × {product.dimensions.depth} ×{" "}
                {product.dimensions.height} mm
              </dd>
            </div>
          </div>
        )}
        {typeof product.weight === "number" && (
          <div className="flex items-start gap-3">
            <Weight size={17} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <dt className="text-micro uppercase text-tertiary">Peso</dt>
              <dd className="font-mono text-body-small">{product.weight} g</dd>
            </div>
          </div>
        )}
        {product.material && (
          <div className="flex items-start gap-3">
            <Package size={17} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <dt className="text-micro uppercase text-tertiary">Material</dt>
              <dd className="text-body-small">{product.material}</dd>
            </div>
          </div>
        )}
      </dl>

      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags do produto">
        {product.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-strong px-3 py-1 text-caption uppercase text-tertiary"
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}
