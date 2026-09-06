"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getToken,
  listCustomRequests,
  listOrders,
  listProducts,
} from "@/lib/admin-api";
import type { CustomRequest } from "@/types/custom-request";
import type { Order } from "@/types/order";
import type { Product } from "@/types/product";
import { inCatalogOrder } from "@/lib/catalog-order";

interface AdminData {
  products: Product[];
  /** `null` enquanto a API não expõe `/orders`. */
  orders: Order[] | null;
  /** Orçamentos sob medida; `null` quando a API não tem o módulo. */
  customRequests: CustomRequest[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Aplica campos a um produto do cache local, sem refetch. */
  patchProduct: (id: string, fields: Partial<Product>) => void;
}

const AdminDataContext = createContext<AdminData | null>(null);

/**
 * Carrega uma vez os dados que o painel inteiro compartilha — a sidebar
 * precisa das contagens, cada tela precisa das listas — e centraliza o
 * desvio para o login quando a sessão caiu.
 */
export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customRequests, setCustomRequests] = useState<CustomRequest[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    try {
      const [rows, orderRows, requestRows] = await Promise.all([
        listProducts(),
        listOrders().catch(() => null),
        listCustomRequests().catch(() => null),
      ]);
      // Mesma âncora da vitrine: a API entrega na ordem de inserção do Mongo,
      // e o painel lista as peças na ordem do catálogo para bater com a loja.
      setProducts(inCatalogOrder(rows));
      setOrders(orderRows);
      setCustomRequests(requestRows);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao carregar";
      if (message.includes("Sessão expirada")) {
        router.replace("/admin/login");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchProduct = useCallback((id: string, fields: Partial<Product>) => {
    setProducts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
  }, []);

  const value = useMemo<AdminData>(
    () => ({
      products,
      orders,
      customRequests,
      loading,
      error,
      refresh: load,
      patchProduct,
    }),
    [products, orders, customRequests, loading, error, load, patchProduct]
  );

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData(): AdminData {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData precisa estar dentro de <AdminDataProvider>");
  }
  return context;
}
