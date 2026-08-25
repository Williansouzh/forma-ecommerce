"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/animations";

export default function ShopTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
