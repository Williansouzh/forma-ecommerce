"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

/**
 * A imagem 01 é sempre a peça em uso — na mesa, na estante, ao lado de um livro.
 * Sem lupa que persegue o mouse: zoom perseguidor é padrão de loja de
 * eletrônico. As miniaturas viram uma coluna fina à esquerda.
 */
export function ProductGallery({ product }: { product: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = product.images;
  const activeImage = images[activeIndex];

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row sm:gap-6">
      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Galeria de imagens do produto"
          className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto sm:w-20 sm:flex-col sm:overflow-visible"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Ver imagem ${index + 1}: ${image.alt}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden bg-surface-muted transition-opacity duration-300 sm:w-full",
                index === activeIndex
                  ? "opacity-100"
                  : "opacity-45 hover:opacity-80"
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                unoptimized={image.url.endsWith(".svg")}
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div
        className="relative aspect-[4/5] flex-1 overflow-hidden bg-surface-muted"
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={activeImage?.url ?? ""}
              alt={activeImage?.alt ?? product.name}
              fill
              priority
              unoptimized={activeImage?.url.endsWith(".svg")}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
