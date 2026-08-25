"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types/cart";

export { getCartTotals } from "@/lib/cart";

interface CartStore {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item) =>
        set((state) => {
          const index = state.items.findIndex(
            (existing) =>
              existing.productId === item.productId &&
              existing.variantId === item.variantId
          );
          if (index >= 0) {
            const items = [...state.items];
            items[index] = {
              ...items[index],
              quantity: Math.min(items[index].quantity + item.quantity, 99),
            };
            return { items };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(
                item.productId === productId && item.variantId === variantId
              )
          ),
        })),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.max(1, Math.min(quantity, 99)) }
              : item
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "forma-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
