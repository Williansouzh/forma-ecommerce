"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types/product";

interface ColorSelectorProps {
  variants: ProductVariant[];
  selected: ProductVariant | undefined;
  onSelect: (variant: ProductVariant) => void;
}

export function ColorSelector({
  variants,
  selected,
  onSelect,
}: ColorSelectorProps) {
  if (!variants.length) return null;

  return (
    <fieldset>
      <legend className="text-caption uppercase text-secondary">
        Cor:{" "}
        <span className="text-primary normal-case">
          {selected?.name ?? "Selecione"}
        </span>
      </legend>
      <div className="mt-3 flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isSelected = selected?.id === variant.id;
          return (
            <motion.button
              key={variant.id}
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(variant)}
              aria-label={variant.name}
              aria-pressed={isSelected}
              title={variant.name}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border border-strong transition-shadow",
                isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
              )}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full"
                style={{ backgroundColor: variant.colorHex }}
              >
                {isSelected && (
                  <Check
                    size={14}
                    className={variant.colorHex === "#EDEDE8" ? "text-primary" : "text-white"}
                  />
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}
