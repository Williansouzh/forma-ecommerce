import type { Variants, Transition } from "framer-motion";

export type Ease = [number, number, number, number];

export const EASE_OUT: Ease = [0.25, 0.1, 0.25, 1];
export const EASE_ENTER: Ease = [0, 0, 0.2, 1];
export const EASE_EXIT: Ease = [0.4, 0, 1, 1];

export const SPRING: Transition = { type: "spring", stiffness: 300, damping: 30 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

export function staggerContainer(stagger = 0.1, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export const VIEWPORT_ONCE = { once: true, margin: "-80px" } as const;
