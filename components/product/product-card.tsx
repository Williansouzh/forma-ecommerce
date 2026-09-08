"use client";

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

export function ProductCard({
  product,
  variant = "grid",
  showCategory = false,
  className,
}: ProductCardProps) {
  const pushToast = useUIStore((state) => state.pushToast);
  const addItem = useCartStore((state) => state.addItem);

  const variants = product.variants ?? [];

  const primaryImage =
    product.images.find((image) => image.isPrimary) ?? product.images[0];

  const shownImage = primaryImage?.url ?? "";
  const hoverImage = product.images[1]?.url ?? primaryImage?.url ?? "";

  const isHorizontal = variant === "horizontal";
  const isEditorial = variant === "editorial";
  const soldOut = !product.isAvailable || product.stock === 0;
  const note = availabilityNote(product);
  const firstVariant = variants[0];
  const category = getCategory(product.category);
  const color = categoryColor(product.category);

  /*
   * A escolha de cor saiu daqui.
   *
   * As bolinhas trocavam a foto e, de quebra, decidiam qual variante ia para o
   * carrinho — por `onMouseEnter`, ou seja, um estado exclusivo de mouse
   * mudando o conteúdo do pedido, sem equivalente por teclado. Escolher cor é
   * decisão que pede contexto: acontece na página do produto, onde o nome da
   * cor está escrito e o preço já reflete a variante.
   *
   * O `firstVariant` continua sendo o que a compra rápida grava. Ele NÃO é
   * opcional: sem `variantId`, dois itens de cores diferentes colidiriam na
   * chave `productId-variantId` que o carrinho usa para separar as linhas.
   */
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
      productionTime: product.productionTime,
    });
    // O drawer não abre sozinho: quem ia pegar uma segunda peça era
    // interrompido. O toast e o pulso do contador já confirmam.
    pushToast(`${product.name} — no carrinho`);
  };

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col",
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
          <span className="absolute left-3 right-3 top-3 w-fit rounded-md bg-background/95 px-2.5 py-1 text-caption uppercase text-primary">
            {product.badge}
          </span>
        )}

        {/* `right-3` fecha a caixa: "Brinquedos e colecionáveis" em caixa alta
            mede ~247px e, com só `left-3`, escorria por cima da foto inteira
            num card de 136px. */}
        {showCategory && category && (
          <span className="absolute bottom-3 left-3 right-3 flex w-fit items-center gap-1.5 rounded-md bg-background/95 px-2.5 py-1 text-caption uppercase text-primary">
            <span aria-hidden className="cat-bg size-2 shrink-0 rounded-full" />
            <span className="line-clamp-2">{category.name}</span>
          </span>
        )}
      </Link>

      <div
        className={cn(
          "flex min-w-0 flex-col pt-3.5",
          isHorizontal && "flex-1 pt-0"
        )}
      >
        {/*
          No celular o nome fica em cima e o preço embaixo; a partir de `sm`
          eles voltam para a mesma linha de base.

          Lado a lado num card de 136–182px o par não cabia: nem o `h3` (que
          não encolhe abaixo da maior palavra) nem o preço em `whitespace-nowrap`
          cediam, e a linha vazava do card — o que colocava barra de rolagem
          horizontal na loja inteira, de 320px a 480px.
        */}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-y-1",
            "sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-3"
          )}
        >
          <h3
            className={cn(
              "min-w-0 font-display leading-snug",
              isEditorial ? "text-heading-1" : "text-heading-3"
            )}
          >
            <Link
              href={`/produto/${product.slug}`}
              className="line-clamp-2 break-words transition-colors duration-200 group-hover:text-accent"
            >
              {product.name}
            </Link>
          </h3>

          {/* Cada preço é indivisível, mas o par pode quebrar entre si: com
              promocional são dois números de ~122px na mesma linha. */}
          <span className="data flex shrink-0 flex-wrap items-baseline gap-x-2 text-[15px] font-medium sm:text-[17px]">
            {product.price === 0 ? (
              <span className="text-body-small font-sans">Sob consulta</span>
            ) : (
              <>
                <span className="whitespace-nowrap">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="whitespace-nowrap text-tertiary line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {isEditorial && product.shortDescription && (
          <p className="mt-1.5 max-w-sm text-body-small text-secondary">
            {product.shortDescription}
          </p>
        )}

        {/*
          Sem altura reservada. As duas `min-h` que existiam aqui — 48px na
          linha do nome e 44px na fileira de bolinhas, esta última mantida
          mesmo em peça sem variante — somavam ~73px de vazio por card num
          bloco cujo conteúdo real mede ~63px.
        */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4">
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
              className="inline-flex min-h-11 items-center text-body-small font-medium text-primary underline decoration-border-strong decoration-1 underline-offset-4 transition-[opacity,text-decoration-color] duration-200 hover:decoration-accent [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
