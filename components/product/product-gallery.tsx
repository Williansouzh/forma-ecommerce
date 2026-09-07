"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/animations";

/**
 * A imagem 01 é sempre a peça em uso — na mesa, na estante, ao lado de um
 * livro. Sem lupa que persegue o mouse: zoom perseguidor é padrão de loja de
 * eletrônico; aqui a foto só cresce um pouco no hover.
 *
 * As miniaturas ficam numa linha embaixo, não numa coluna: em 82px elas leem
 * como contato de filme, e a foto grande fica com a largura inteira.
 */
export function ProductGallery({ product }: { product: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = product.images;
  const activeImage = images[activeIndex];

  return (
    <div className="min-w-[280px] flex-[1_1_min(100%,560px)]">
      <div className="group relative aspect-[4/5] overflow-hidden bg-surface-muted">
        {/*
          `initial={false}`: sem isso a foto principal do produto montava em
          `opacity: 0` e só aparecia quando o framer-motion hidratasse e
          rodasse a animação. A imagem que decide a compra não pode depender
          de JavaScript para existir. A transição continua valendo na troca
          entre miniaturas, que é onde ela serve para alguma coisa.
        */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="absolute inset-0"
          >
            <Image
              src={activeImage?.url ?? ""}
              alt={activeImage?.alt ?? product.name}
              fill
              priority
              unoptimized={activeImage?.url.endsWith(".svg")}
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0.6,0.3,1)] group-hover:scale-[1.06]"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Galeria de imagens do produto"
          className="no-scrollbar mt-2.5 flex gap-2.5 overflow-x-auto"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Ver imagem ${index + 1}: ${image.alt}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative aspect-square w-[82px] shrink-0 overflow-hidden rounded-md border bg-surface-muted transition-colors",
                index === activeIndex
                  ? "border-primary"
                  : "border-border-strong hover:border-accent"
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                unoptimized={image.url.endsWith(".svg")}
                sizes="82px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <p className="label mt-4 text-tertiary">
        Fotos reais das peças que saem do ateliê
      </p>
    </div>
  );
}
