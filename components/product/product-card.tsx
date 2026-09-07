"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";
import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice, cn } from "@/lib/utils";
import { availabilityNote } from "@/lib/product-availability";
import { categoryColor, getCategory } from "@/data/categories";

/**
 * `editorial` é o card da vitrine: nome maior, descrição curta, respiro.
 * `grid` é o do catálogo: mais sóbrio, para varrer e comparar.
 * `horizontal` é o da lista lateral (carrinho, relacionados).
 *
 * Antes eram dois componentes distintos — este e um `CatalogCard` privado
 * dentro de `catalog-view.tsx` — que divergiram em oito pontos: tamanho do
 * nome, peso do preço, tamanho do selo, e o catálogo não mostrava as cores.
 */
type CardVariant = "editorial" | "grid" | "horizontal";

interface ProductCardProps {
  product: Product;
  variant?: CardVariant;
  /** Mostra o selo da categoria — só faz sentido em grade misturada. */
  showCategory?: boolean;
  className?: string;
}

/** Até cinco bolinhas; o resto vira "+N". Mais que isso vira confete. */
const MAX_SWATCHES = 5;

export function ProductCard({
  product,
  variant = "grid",
  showCategory = false,
  className,
}: ProductCardProps) {
  const pushToast = useUIStore((state) => state.pushToast);
  const addItem = useCartStore((state) => state.addItem);

  const variants = product.variants ?? [];
  // Com uma variante só não há escolha a mostrar: uma bolinha sozinha embaixo
  // do preço não informa nada e lê como sujeira.
  const allSwatches = variants.filter((item) => item.colorHex);
  const swatches = allSwatches.length > 1 ? allSwatches : [];
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const activeVariant =
    variants.find((item) => item.id === activeVariantId) ?? null;

  const primaryImage =
    product.images.find((image) => image.isPrimary) ?? product.images[0];

  // A bolinha troca a foto quando a variante tem foto própria; é a dúvida real
  // de quem compra peça impressa ("como fica em azul?"), não um efeito.
  const shownImage = activeVariant?.images?.[0] ?? primaryImage?.url ?? "";
  const hoverImage = product.images[1]?.url ?? primaryImage?.url ?? "";

  const isHorizontal = variant === "horizontal";
  const isEditorial = variant === "editorial";
  const soldOut = !product.isAvailable || product.stock === 0;
  const note = availabilityNote(product);
  const firstVariant = variants[0];
  const category = getCategory(product.category);
  const color = categoryColor(product.category);

  const quickAdd = () => {
    const chosen = activeVariant ?? firstVariant;
    addItem({
      productId: product.id,
      variantId: chosen?.id,
      quantity: 1,
      price: product.price + (chosen?.priceAdjustment ?? 0),
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url,
      variantName: chosen?.name,
      productionTime: product.productionTime,
    });
    // O drawer não abre sozinho: quem ia pegar uma segunda peça era
    // interrompido. O toast e o pulso do contador já confirmam.
    pushToast(`${product.name} — no carrinho`);
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        isHorizontal && "flex-row items-center gap-6",
        soldOut && "opacity-60",
        className
      )}
      style={
        {
          "--cat-light": color.light,
          "--cat-dark": color.dark,
        } as React.CSSProperties
      }
    >
      {/* Sem moldura, sem sombra, sem filtro: o objeto recortado sobre a bancada.
          Proporção 4:5 em todas as telas — é o que deixa comparar tamanho. */}
      <Link
        href={`/produto/${product.slug}`}
        aria-label={product.name}
        tabIndex={-1}
        className={cn(
          "relative block shrink-0 overflow-hidden bg-surface-muted",
          isHorizontal ? "aspect-square w-32 sm:w-44" : "aspect-[4/5] w-full"
        )}
      >
        {shownImage && (
          <Image
            src={shownImage}
            alt={primaryImage?.alt ?? product.name}
            fill
            unoptimized={shownImage.endsWith(".svg")}
            sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 320px"
            className="object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
        )}
        {hoverImage && (
          <Image
            src={hoverImage}
            alt=""
            fill
            unoptimized={hoverImage.endsWith(".svg")}
            sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 320px"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {product.badge && (
          <span className="absolute left-3 top-3 rounded-md bg-background/95 px-2.5 py-1 text-caption uppercase text-primary">
            {product.badge}
          </span>
        )}

        {showCategory && category && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-background/95 px-2.5 py-1 text-caption uppercase text-primary">
            <span aria-hidden className="cat-bg size-2 rounded-full" />
            {category.name}
          </span>
        )}
      </Link>

      <div className={cn("flex flex-col pt-4", isHorizontal && "flex-1 pt-0")}>
        {/* `min-h` alinha os preços entre cards de nome curto e longo. */}
        <div
          className={cn(
            "flex items-baseline justify-between gap-3",
            !isEditorial && !isHorizontal && "min-h-12"
          )}
        >
          <h3
            className={cn(
              "font-display leading-snug",
              isEditorial ? "text-heading-1" : "text-heading-3"
            )}
          >
            <Link
              href={`/produto/${product.slug}`}
              className="transition-colors duration-200 group-hover:text-accent"
            >
              {product.name}
            </Link>
          </h3>

          <span className="data whitespace-nowrap text-[17px] font-medium">
            {product.price === 0 ? (
              <span className="text-body-small font-sans">Sob consulta</span>
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
          </span>
        </div>

        {isEditorial && product.shortDescription && (
          <p className="mt-1 max-w-sm text-body-small text-secondary">
            {product.shortDescription}
          </p>
        )}

        {/* As cores disponíveis. Em impressão 3D a cor é a variante — é o
            primeiro critério de comparação e faltava justamente na tela de
            comparar. Alvo de toque de 44px com a bolinha desenhada em 10px.

            Na grade a linha é reservada mesmo quando a peça não tem variante:
            senão o preço e o "Adicionar" das peças sem cor sobem 44px e a
            fileira inteira perde a linha de base — que é justamente o que
            deixa comparar. */}
        {(swatches.length > 0 || !isEditorial) && (
          <div className="-ml-2 mt-1.5 flex min-h-11 flex-wrap items-center">
            {swatches.slice(0, MAX_SWATCHES).map((item) => {
              const active = item.id === activeVariantId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setActiveVariantId(active ? null : item.id)
                  }
                  onMouseEnter={() => setActiveVariantId(item.id)}
                  aria-pressed={active}
                  aria-label={`Ver em ${item.name}`}
                  className="grid size-11 place-items-center"
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: item.colorHex }}
                    className={cn(
                      "size-2.5 rounded-full ring-1 ring-inset ring-black/20 transition-shadow duration-150",
                      active && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                    )}
                  />
                </button>
              );
            })}
            {swatches.length > MAX_SWATCHES && (
              <span className="data ml-1 text-[13px] text-tertiary">
                +{swatches.length - MAX_SWATCHES}
              </span>
            )}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {note && (
            <span className="data text-[13px] text-tertiary">{note}</span>
          )}

          {/* Visível por padrão; só se esconde atrás do hover onde existe
              hover. Antes era `opacity-0` sempre, ou seja: no celular a
              compra rápida não existia. */}
          {!soldOut && product.price > 0 && (
            <button
              type="button"
              onClick={quickAdd}
              className="text-body-small font-medium text-primary underline decoration-border-strong decoration-1 underline-offset-4 transition-[opacity,text-decoration-color] duration-200 hover:decoration-accent [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
