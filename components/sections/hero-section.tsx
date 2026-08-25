"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EASE_OUT } from "@/lib/animations";

const LAYERS = [
  { w: 96, y: 0 },
  { w: 128, y: 26 },
  { w: 152, y: 52 },
  { w: 168, y: 78 },
  { w: 176, y: 104 },
  { w: 172, y: 130 },
  { w: 158, y: 156 },
  { w: 138, y: 182 },
  { w: 116, y: 208 },
  { w: 98, y: 234 },
  { w: 92, y: 260 },
];

function FloatingObject({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <motion.div
        animate={reduced ? undefined : { y: [0, -18, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <svg
          viewBox="0 0 320 300"
          fill="none"
          role="img"
          aria-label="Objeto decorativo produzido por impressão 3D"
          className="w-full drop-shadow-xl"
        >
          <defs>
            <linearGradient id="forma-layer" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E8A88C" />
              <stop offset="100%" stopColor="#C75B2A" />
            </linearGradient>
            <linearGradient id="forma-layer-dark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C75B2A" />
              <stop offset="100%" stopColor="#A0461C" />
            </linearGradient>
          </defs>
          {LAYERS.map((layer, index) => (
            <rect
              key={index}
              x={160 - layer.w / 2}
              y={20 + layer.y}
              width={layer.w}
              height={22}
              rx={11}
              fill={index % 2 === 0 ? "url(#forma-layer)" : "url(#forma-layer-dark)"}
            />
          ))}
        </svg>
      </motion.div>

      <motion.div
        aria-hidden
        animate={
          reduced
            ? undefined
            : { scaleX: [1, 0.86, 1], opacity: [0.16, 0.1, 0.16] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto mt-[-8px] h-4 w-56 rounded-[100%] bg-primary blur-md"
      />

      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-muted md:size-[480px]"
      />
    </div>
  );
}

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);

  return (
    <section
      ref={ref}
      aria-label="Apresentação"
      className="relative flex min-h-svh items-center overflow-hidden pt-24"
    >
      <div className="shell relative z-10 grid w-full items-center gap-16 pb-20 lg:grid-cols-2">
        <motion.div
          initial="hidden"
          animate="visible"
          className="max-w-xl"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0, ease: EASE_OUT }}
            className="flex items-center gap-3 text-caption uppercase text-secondary"
          >
            <span aria-hidden className="h-px w-8 bg-accent" />
            Impressão 3D premium · São Paulo
          </motion.p>

          <h1 className="mt-7 font-display text-display-1">
            {["Objetos", "feitos para", "existir"].map((line, index) => (
              <motion.span
                key={line}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.12,
                  ease: EASE_OUT,
                }}
                className="block"
              >
                {line}
                {index === 2 && <span className="text-accent">.</span>}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: EASE_OUT }}
            className="mt-7 max-w-md text-body-large leading-relaxed text-secondary"
          >
            Colecionáveis, decoração e peças sob demanda — modeladas,
            impressas em alta precisão e inspecionadas à mão.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8, ease: EASE_OUT }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/colecoes"
              className="group inline-flex items-center justify-center gap-3 rounded-md bg-accent px-8 py-3.5 text-body font-medium text-white shadow-glow transition-all hover:-translate-y-px hover:bg-accent-dark active:scale-[0.98]"
            >
              Explorar coleção
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/personalizados"
              className="nav-link inline-flex items-center justify-center rounded-md px-8 py-3.5 text-body font-medium text-primary transition-colors hover:text-accent"
            >
              Pedir peça personalizada
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: visualY }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE_OUT }}
          className="hidden md:block"
        >
          <FloatingObject reduced={!!reduced} />
        </motion.div>
      </div>
    </section>
  );
}
