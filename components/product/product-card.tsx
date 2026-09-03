"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Product } from "@/types/product";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, cn } from "@/lib/utils";

type CardVariant = "large" | "medium" | "tall" | "wide" | "horizontal";

interface ProductCardProps {
  product: Product;
  variant?: CardVariant;
  /** Atraso do reveal, em segundos (vai direto para o `delay` do framer). */
  revealDelay?: number;
  className?: string;
}

/**
 * Proporções deliberadamente irregulares. Grid perfeito lê como catálogo;
 * alturas diferentes na mesma linha leem como página de revista.
 */
const ratio: Record<CardVariant, string> = {
  large: "aspect-[4/5]",
  medium: "aspect-square",
  tall: "aspect-[3/4]",
  wide: "aspect-[5/4]",
  horizontal: "aspect-square",
};

/** Estoque se diz com palavra, não com semáforo. */
function availabilityNote(product: Product): string | null {
  const soldOut = !product.isAvailable || product.stock === 0;
  if (soldOut) return "Esgotado";
  if (product.price === 0) return "Sob encomenda";
  if (typeof product.stock === "number" && product.stock <= 3) {
    return product.stock === 1 ? "Última peça" : `Restam ${product.stock}`;
  }
  return null;
}

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
  const note = availabilityNote(product);
  const firstVariant = product.variants?.[0];

  // Material e cor viram uma linha sussurrada, não uma ficha técnica.
  const whisper = [product.material, firstVariant?.name]
    .filter(Boolean)
    .join(", ");

  const quickAdd = () => {
    addItem({
      productId: product.id,
      variantId: firstVariant?.id,
      quantity: 1,
      price: product.price + (firstVariant?.priceAdjustment ?? 0),
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url,
      variantName: firstVariant?.name,
    });
    pushToast(`${product.name} — no carrinho`);
    openCart();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: revealDelay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={cn(
        "group relative flex flex-col",
        isHorizontal && "flex-row items-center gap-6",
        soldOut && "opacity-55",
        className
      )}
    >
      {/* Sem caixa, sem borda, sem sombra: o objeto recortado sobre o linho. */}
      <Link
        href={`/produto/${product.slug}`}
        aria-label={product.name}
        className={cn(
          "relative block shrink-0 overflow-hidden bg-surface-muted",
          isHorizontal ? "aspect-square w-32 sm:w-44" : cn("w-full", ratio[variant])
        )}
      >
        <Image
          src={primaryImage?.url ?? ""}
          alt={primaryImage?.alt ?? product.name}
          fill
          unoptimized={primaryImage?.url.endsWith(".svg")}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-opacity duration-700 group-hover:opacity-0"
        />
        <Image
          src={hoverImage?.url ?? ""}
          alt=""
          fill
          unoptimized={hoverImage?.url.endsWith(".svg")}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        />
      </Link>

      <div className={cn("flex flex-col pt-5", isHorizontal && "flex-1 pt-0")}>
        <h3 className="font-display text-heading-3 leading-snug">
          <Link
            href={`/produto/${product.slug}`}
            className="transition-colors duration-300 group-hover:text-accent"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 text-body-small tabular-nums text-secondary">
          {product.price === 0 ? (
            "Sob consulta"
          ) : (
            <>
              {formatPrice(product.price)}
              {product.originalPrice && (
                <span className="ml-2 text-tertiary line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </>
          )}
        </p>

        {whisper && (
          <p className="mt-1 text-body-small italic text-tertiary">{whisper}</p>
        )}

        {/* "Adicionar" aparece no hover, embaixo do preço — nunca em cima da foto. */}
        <div className="mt-2 flex min-h-[1.4rem] items-center gap-3 text-body-small">
          {note && <span className="italic text-accent">{note}</span>}
          {!soldOut && product.price > 0 && (
            <button
              type="button"
              onClick={quickAdd}
              className="text-primary underline decoration-border-strong decoration-1 underline-offset-4 opacity-0 transition-opacity duration-300 hover:decoration-accent focus-visible:opacity-100 group-hover:opacity-100"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
