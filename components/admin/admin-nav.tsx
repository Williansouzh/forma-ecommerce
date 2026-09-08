"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { clearToken } from "@/lib/admin-api";
import { isPending } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import { useAdminData } from "./admin-data";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * A sidebar é sempre escura, independente do tema da loja — por isso os
 * hex literais em vez dos tokens, que invertem no modo escuro.
 */
const INK = "#1B1A15";
const SAND = "#EDE6D7";
const CLAY_LIGHT = "#D68A63";

interface NavItem {
  href: string;
  name: string;
  count?: number;
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { products, orders } = useAdminData();
  const isCompact = useMediaQuery("(max-width: 899px)");
  const [open, setOpen] = useState(false);

  // Trocar de página fecha a gaveta sozinha — sem isso, um link levaria para
  // a tela seguinte com o menu ainda aberto por cima dela.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Mesmo padrão do overlay de busca da loja: com a gaveta aberta, a página
  // de trás não rola junto — senão dá para "perder" o menu arrastando o dedo
  // por cima dele.
  useEffect(() => {
    if (!isCompact) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCompact, open]);

  // Mesmo atalho do ProductDrawer: Esc fecha, sem precisar mirar no X.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pending = orders?.filter((order) => isPending(order.status)).length;

  const items: NavItem[] = [
    { href: "/admin", name: "Painel" },
    { href: "/admin/produtos", name: "Produtos", count: products.length },
    { href: "/admin/pedidos", name: "Pedidos", count: pending },
    { href: "/admin/home", name: "Vitrine" },
    { href: "/admin/integracoes", name: "Integrações" },
    { href: "/admin/shopee", name: "Shopee" },
    { href: "/admin/configuracoes", name: "Configurações" },
  ];

  const logout = () => {
    clearToken();
    router.replace("/admin/login");
  };

  /** A lista de rotas — o mesmo bloco, dentro da sidebar fixa ou da gaveta. */
  const navLinks = (
    <nav className="mt-3.5 flex min-w-0 flex-1 flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              background: active ? "rgba(237, 230, 215, 0.12)" : "transparent",
              color: active ? SAND : "rgba(237, 230, 215, 0.66)",
            }}
            className={cn(
              "flex min-h-[42px] items-center gap-2.5 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors duration-200",
              !active && "hover:!bg-[rgba(237,230,215,0.09)]"
            )}
          >
            <span
              aria-hidden
              style={{
                background: active ? CLAY_LIGHT : "rgba(237, 230, 215, 0.22)",
              }}
              className="size-[5px] shrink-0 rounded-full"
            />
            {item.name}
            {item.count != null && (
              <span
                style={{ color: "rgba(237, 230, 215, 0.5)" }}
                className="ml-auto pl-2 text-[11.5px] font-bold tabular-nums"
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  /** "Ver a loja" e "Sair" — o mesmo bloco nos dois modos. */
  const footerLinks = (
    <div className="flex shrink-0 flex-col">
      <Link
        href="/"
        style={{ color: "rgba(237, 230, 215, 0.55)" }}
        className="flex min-h-[40px] items-center gap-2 whitespace-nowrap px-3 text-[13px] transition-colors hover:!text-[#D68A63]"
      >
        Ver a loja ↗
      </Link>
      <button
        type="button"
        onClick={logout}
        style={{ color: "rgba(237, 230, 215, 0.4)" }}
        className="flex min-h-[40px] items-center gap-2 whitespace-nowrap px-3 text-left text-[13px] transition-colors hover:!text-[#D68A63]"
      >
        Sair
      </button>
    </div>
  );

  /** O bloco de marca — repetido na barra fina do celular e no topo da gaveta/sidebar. */
  const brand = (
    <Link
      href="/"
      style={{ color: SAND }}
      className="whitespace-nowrap font-display text-[21px] tracking-[-0.02em]"
    >
      c3dcriativ<span style={{ color: CLAY_LIGHT }}>.</span>
    </Link>
  );

  if (isCompact) {
    return (
      <>
        {/*
          A barra ocupa espaço de verdade no layout (o `main` do AdminShell
          continua fluindo normalmente logo abaixo dela). A gaveta que abre a
          partir do menu é `fixed`, por cima de tudo — não empurra nada.
        */}
        <div
          style={{ background: INK }}
          className="flex w-full shrink-0 items-center justify-between px-4 py-3"
        >
          {brand}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu do painel"
            aria-expanded={open}
            style={{ color: SAND }}
            className="flex size-11 items-center justify-center rounded-md transition-colors hover:bg-[rgba(237,230,215,0.1)]"
          >
            <Menu size={22} />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[100] flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-[rgba(27,26,21,0.55)]"
                aria-hidden
              />
              <motion.aside
                role="dialog"
                aria-modal="true"
                aria-label="Menu do painel"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ background: INK, color: "rgba(237, 230, 215, 0.72)" }}
                className="relative flex h-full w-[min(82%,300px)] flex-col overflow-y-auto px-4 py-[18px]"
              >
                <div className="flex items-center justify-between px-1.5">
                  {brand}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar menu"
                    style={{ color: "rgba(237, 230, 215, 0.6)" }}
                    className="flex size-11 shrink-0 items-center justify-center transition-colors hover:!text-[#D68A63]"
                  >
                    <X size={22} />
                  </button>
                </div>
                <div
                  style={{ color: "rgba(237, 230, 215, 0.4)" }}
                  className="px-3 text-micro uppercase"
                >
                  Painel de gestão
                </div>

                {navLinks}
                {footerLinks}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <aside
      style={{ background: INK, color: "rgba(237, 230, 215, 0.72)" }}
      className="flex w-[244px] shrink-0 flex-col items-stretch gap-2 px-4 py-[22px]"
    >
      <div className="px-1.5">
        {brand}
        <div
          style={{ color: "rgba(237, 230, 215, 0.4)" }}
          className="mt-1 whitespace-nowrap text-micro uppercase"
        >
          Painel de gestão
        </div>
      </div>
      {navLinks}
      {footerLinks}
    </aside>
  );
}
