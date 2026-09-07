"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { useScroll } from "@/hooks/use-scroll";
import { useCartStore, getCartTotals } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/animations";

export function Header() {
  const scrolled = useScroll(50);
  const cartCount = useCartStore((state) => getCartTotals(state.items).count);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const openCart = useUIStore((state) => state.openCart);
  const openSearch = useUIStore((state) => state.openSearch);
  const menuOpen = useUIStore((state) => state.menuOpen);
  const toggleMenu = useUIStore((state) => state.toggleMenu);
  const closeMenu = useUIStore((state) => state.closeMenu);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        // `sticky`, não `fixed`: a barra ocupa lugar no fluxo e o hero começa
        // embaixo dela, como no handoff. Com `fixed` a foto passava por trás
        // do header e empurrava tudo 73px para cima.
        "sticky top-0 z-50 border-b bg-background/[0.86] backdrop-blur-[14px] transition-colors duration-300",
        scrolled || menuOpen ? "border-border-strong" : "border-border-subtle"
      )}
    >
      <div className="shell flex items-center gap-[clamp(14px,3vw,40px)] py-3.5">
        <button
          type="button"
          onClick={toggleMenu}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          className="flex size-11 shrink-0 items-center justify-center text-primary lg:hidden"
        >
          {menuOpen ? <X size={21} strokeWidth={1} /> : <Menu size={21} strokeWidth={1} />}
        </button>

        <Link
          href="/"
          onClick={closeMenu}
          className="whitespace-nowrap font-display text-[clamp(19px,2.4vw,25px)] leading-none tracking-[-0.02em] text-primary"
          aria-label={`${SITE_NAME} — página inicial`}
        >
          c3dcriativ<span className="text-clay">.</span>
        </Link>

        {/* Encostada no logotipo e ocupando a folga: a navegação é o assunto
            da barra, não um bloco centralizado com vazio dos dois lados. */}
        <nav
          aria-label="Navegação principal"
          className="hidden min-w-0 flex-1 lg:block"
        >
          <ul className="flex items-center gap-[clamp(14px,2.2vw,30px)]">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="whitespace-nowrap border-b border-transparent pb-0.5 text-[13.5px] font-medium tracking-[0.02em] text-primary transition-colors duration-300 hover:border-accent hover:text-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Buscar produtos"
            className="grid size-11 place-items-center rounded-md border border-transparent text-primary transition-colors hover:border-border-strong"
          >
            <Search size={19} strokeWidth={1} />
          </button>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Sacola${hasHydrated && cartCount > 0 ? ` com ${cartCount} itens` : " vazia"}`}
            className="flex h-11 items-center gap-[9px] rounded-md border border-border-strong px-3.5 text-primary transition-colors hover:border-accent hover:text-accent"
          >
            <ShoppingBag size={18} strokeWidth={1} />
            {/* Antes da hidratação o carrinho ainda não foi lido do storage;
                mostrar 0 e depois trocar piscaria o número. */}
            <motion.span
              key={cartCount}
              initial={false}
              animate={hasHydrated && cartCount > 0 ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="text-[13px] font-semibold tabular-nums"
            >
              {hasHydrated ? cartCount : 0}
            </motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            aria-label="Menu móvel"
            className="overflow-hidden border-t border-border-subtle bg-background lg:hidden"
          >
            <ul className="shell flex flex-col py-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className="flex h-16 items-center border-b border-border-subtle font-display text-heading-2 text-primary"
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
