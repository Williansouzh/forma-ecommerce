"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  X,
} from "lucide-react";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { useScroll } from "@/hooks/use-scroll";
import { useCartStore, getCartTotals } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

function useTheme() {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("forma-theme", isDark ? "dark" : "light");
    } catch {}
  };
  return toggle;
}

export function Header() {
  const scrolled = useScroll(50);
  const cartCount = useCartStore((state) => getCartTotals(state.items).count);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const openCart = useUIStore((state) => state.openCart);
  const openSearch = useUIStore((state) => state.openSearch);
  const menuOpen = useUIStore((state) => state.menuOpen);
  const toggleMenu = useUIStore((state) => state.toggleMenu);
  const closeMenu = useUIStore((state) => state.closeMenu);
  const toggleTheme = useTheme();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || menuOpen
          ? "border-b bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="shell flex h-16 items-center justify-between gap-6 md:h-20">
        <button
          type="button"
          onClick={toggleMenu}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          className="flex size-11 items-center justify-center rounded-md text-primary lg:hidden"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          onClick={closeMenu}
          className="font-display text-heading-3 tracking-tight text-primary transition-transform duration-200 hover:scale-[1.03]"
          aria-label={`${SITE_NAME} — página inicial`}
        >
          FORMA<span className="text-accent">.</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="nav-link text-body-small font-medium text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema claro/escuro"
            className="flex size-11 items-center justify-center rounded-md text-secondary transition-colors hover:text-primary"
          >
            <Sun size={20} className="dark:hidden" />
            <Moon size={20} className="hidden dark:block" />
          </button>
          <button
            type="button"
            onClick={openSearch}
            aria-label="Buscar produtos"
            className="flex size-11 items-center justify-center rounded-md text-secondary transition-colors hover:text-primary"
          >
            <Search size={20} />
          </button>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Carrinho${hasHydrated && cartCount > 0 ? ` com ${cartCount} itens` : ""}`}
            className="relative flex size-11 items-center justify-center rounded-md text-secondary transition-colors hover:text-primary"
          >
            <ShoppingBag size={20} />
            {hasHydrated && cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.4 }}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-accent font-mono text-micro font-medium text-white"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            aria-label="Menu móvel"
            className="overflow-hidden border-t bg-background lg:hidden"
          >
            <ul className="shell flex flex-col py-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className="flex h-14 items-center border-b font-display text-heading-3 text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
