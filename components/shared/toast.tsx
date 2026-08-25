"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toaster() {
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];
          return (
            <motion.button
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => dismissToast(toast.id)}
              className="pointer-events-auto mb-2 flex items-center gap-2.5 rounded-md bg-primary px-5 py-3 text-body-small text-background shadow-xl"
            >
              <Icon size={18} className="shrink-0" style={{ color: "var(--color-accent)" }} />
              {toast.message}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
