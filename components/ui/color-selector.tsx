"use client";

import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types/product";

interface ColorSelectorProps {
  variants: ProductVariant[];
  selected: ProductVariant | undefined;
  onSelect: (variant: ProductVariant) => void;
}

/**
 * O círculo sobrevive aqui — é a única forma que faz sentido para um swatch.
 * Selecionado se marca com um contorno afastado, não com um check de aplicativo:
 * nome de cor é metade do prazer de escolher, então ele fica visível sempre.
 */
export function ColorSelector({
  variants,
  selected,
  onSelect,
}: ColorSelectorProps) {
  if (!variants.length) return null;

  return (
    <fieldset>
      <legend className="label text-tertiary">Cor</legend>
      <p className="mt-1.5 font-display text-heading-3">
        {selected?.name ?? "Escolha uma"}
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        {variants.map((variant) => {
          const isSelected = selected?.id === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant)}
              aria-label={variant.name}
              aria-pressed={isSelected}
              title={variant.name}
              className={cn(
                "size-7 rounded-full transition-shadow duration-300",
                isSelected
                  ? "outline outline-1 outline-offset-[5px] outline-primary"
                  : "outline outline-1 outline-offset-0 outline-border-strong hover:outline-offset-[3px]"
              )}
              style={{ backgroundColor: variant.colorHex }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
