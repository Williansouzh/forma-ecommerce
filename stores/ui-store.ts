"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UIStore {
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  toasts: Toast[];
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleMenu: () => void;
  closeMenu: () => void;
  pushToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  toasts: [],
  openCart: () => set({ cartOpen: true, menuOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  openSearch: () => set({ searchOpen: true, menuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),
  pushToast: (message, variant = "success") => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 3000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
