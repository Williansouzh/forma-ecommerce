"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, cn } from "@/lib/utils";

type CardVariant = "large" | "medium" | "wide" | "horizontal";

interface ProductCardProps {
  product: Product;
  variant?: CardVariant;
  revealDelay?: number;
  className?: string;
}

const statusConfig = {
  in_stock: { label: "Em estoque", dot: "bg-success" },
  low_stock: { label: "Últimas unidades", dot: "bg-warning" },
  made_to_order: { label: "Sob encomenda", dot: "bg-accent" },
  sold_out: { label: "Esgotado", dot: "bg-error" },
} as const;

export function ProductCard({
  product,
  variant = "medium",
  revealDelay = 0,
  className,
}: ProductCardProps) {
  const openCart = useUIStore((state) => state.openCart);
  const pushToast = useUIStore((state) => state.pushToast);
  const addItem = useCartStore((state) => state.addItem);

  const primaryImage = product.images[0];
  const hoverImage = product.images[1] ?? primaryImage;
  const isHorizontal = variant === "horizontal";
  const soldOut = !product.isAvailable || product.stock === 0;
  const status = soldOut
    ? statusConfig.sold_out
    : product.price === 0
      ? statusConfig.made_to_order
      : statusConfig.in_stock;

  const quickAdd = () => {
    addItem({
      productId: product.id,
      variantId: product.variants?.[0]?.id,
      quantity: 1,
      price: product.price + (product.variants?.[0]?.priceAdjustment ?? 0),
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url,
      variantName: product.variants?.[0]?.name,
    });
    pushToast(`${product.name} adicionado ao carrinho`);
    openCart();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.4,
        delay: revealDelay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={soldOut ? undefined : "hover"}
      className={cn(
        "group relative flex flex-col transition-[transform,box-shadow] duration-300",
        !soldOut && "hover:-translate-y-1 hover:shadow-glow",
        isHorizontal && "flex-row",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-surface-muted",
          isHorizontal
            ? "aspect-square w-40 sm:w-56"
            : cn(
                "w-full",
                variant === "large" ? "aspect-[4/3]" : "aspect-square"
              )
        )}
      >
        <Link
          href={`/produto/${product.slug}`}
          aria-label={product.name}
          className="relative block h-full w-full"
        >
          <motion.div
            variants={{
              hover: { scale: isHorizontal ? undefined : 1.08 },
            }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={primaryImage?.url ?? ""}
              alt={primaryImage?.alt ?? product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
            <Image
              src={hoverImage?.url ?? ""}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          </motion.div>

          <div className="absolute left-3 top-3 flex gap-2">
            {product.badge && (
              <Badge variant={soldOut ? "error" : "accent"}>{product.badge}</Badge>
            )}
            {product.originalPrice && (
              <Badge variant="muted">
                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
              </Badge>
            )}
          </div>

          {!soldOut && (
            <motion.button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                quickAdd();
              }}
              variants={{
                hover: { opacity: 1, scale: 1, y: 0 },
              }}
              initial={{ opacity: 0, scale: 0.8, y: 12 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              aria-label={`Adicionar ${product.name} ao carrinho`}
              className={cn(
                "absolute bottom-3 right-3 z-10 flex size-11 items-center justify-center rounded-md bg-primary text-background shadow-lg transition-colors hover:bg-accent hover:text-white",
                isHorizontal && "bottom-auto top-3 right-3"
              )}
            >
              <Plus size={18} />
            </motion.button>
          )}
        </Link>
      </div>

      <div
        className={cn(
          "flex flex-col pb-2 pt-4",
          isHorizontal && "flex-1 justify-center py-4 pl-5 pr-2"
        )}
      >
        <p className="text-caption uppercase text-tertiary">{product.category}</p>
        <h3
          className={cn(
            "mt-1.5 tracking-tight",
            isHorizontal ? "font-display text-heading-3" : "text-body-large font-medium"
          )}
        >
          <Link
            href={`/produto/${product.slug}`}
            className="transition-colors group-hover:text-accent"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "tabular-nums",
                product.price === 0
                  ? "text-body-small text-secondary"
                  : "text-body-small font-medium"
              )}
            >
              {product.price === 0 ? "Sob consulta" : formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-micro tabular-nums text-quaternary line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-micro uppercase text-tertiary">
            <span
              className={cn("size-1.5 rounded-full", status.dot)}
              aria-hidden
            />
            {status.label}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
