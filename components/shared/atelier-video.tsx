"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AtelierVideoProps {
  /**
   * Vídeo curto da impressora rodando. Sem ele, o slot mostra só o poster —
   * é assim que ele nasce, até os arquivos entrarem em `public/videos/`.
   */
  src?: string;
  poster: string;
  alt: string;
  className?: string;
}

/**
 * Os três slots de "ao vivo" do ateliê. Vídeo mudo em loop, que é um GIF
 * decente; quem pediu menos movimento no sistema recebe a foto parada.
 */
export function AtelierVideo({
  src,
  poster,
  alt,
  className,
}: AtelierVideoProps) {
  const reduced = useReducedMotion();

  if (!src || reduced) {
    return (
      <Image
        src={poster}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 40vw"
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <video
      src={src}
      poster={poster}
      aria-label={alt}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}
