"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  return (
    <aside
      style={{ background: INK, color: "rgba(237, 230, 215, 0.72)" }}
      className={cn(
        "flex shrink-0 gap-2 px-4 py-[22px]",
        isCompact
          ? "w-full flex-row items-center"
          : "w-[244px] flex-col items-stretch"
      )}
    >
      <div className={cn("px-1.5", isCompact && "mr-2.5")}>
        <Link
          href="/"
          style={{ color: SAND }}
          className="whitespace-nowrap font-display text-[21px] tracking-[-0.02em]"
        >
          c3dcriativ<span style={{ color: CLAY_LIGHT }}>.</span>
        </Link>
        {!isCompact && (
          <div
            style={{ color: "rgba(237, 230, 215, 0.4)" }}
            className="mt-1 whitespace-nowrap text-micro uppercase"
          >
            Painel de gestão
          </div>
        )}
      </div>

      <nav
        className={cn(
          "flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]",
          isCompact ? "flex-row" : "mt-3.5 flex-col"
        )}
      >
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

      <div className={cn("flex shrink-0", isCompact ? "flex-row" : "flex-col")}>
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
    </aside>
  );
}
