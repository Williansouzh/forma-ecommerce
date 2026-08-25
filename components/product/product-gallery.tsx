"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

export function ProductGallery({ product }: { product: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const imageRef = useRef<HTMLDivElement>(null);
  const images = product.images;

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div>
      <div
        ref={imageRef}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
        className="relative aspect-square overflow-hidden rounded-lg border border-border-subtle bg-surface-muted"
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 cursor-zoom-in"
          >
            <Image
              src={images[activeIndex]?.url ?? ""}
              alt={images[activeIndex]?.alt ?? product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-500"
              style={{ transformOrigin: origin, transform: zoomed ? "scale(1.75)" : "scale(1)" }}
            />
          </motion.div>
        </AnimatePresence>

        {product.badge && (
          <span className="absolute left-4 top-4 rounded-sm bg-primary px-2.5 py-1 text-caption uppercase text-background">
            {product.badge}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Galeria de imagens do produto"
          className="mt-4 grid grid-cols-4 gap-3"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Ver imagem ${index + 1}: ${image.alt}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border transition-all",
                index === activeIndex
                  ? "border-accent ring-1 ring-accent"
                  : "border-border-subtle opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
