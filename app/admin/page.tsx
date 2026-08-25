"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import {
  clearToken,
  deleteProduct,
  getToken,
  listProducts,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    listProducts()
      .then((rows) => setProducts(rows))
      .catch((err: Error) => {
        if (err.message.includes("Sessão expirada")) {
          router.replace("/admin/login");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Remover “${product.name}”? Esta ação não pode ser desfeita.`)) return;
    setDeleting(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover");
    } finally {
      setDeleting(null);
    }
  };

  const logout = () => {
    clearToken();
    router.replace("/admin/login");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-caption uppercase text-tertiary">Super admin</p>
          <h1 className="mt-1 font-display text-heading-2 tracking-tight">
            Produtos <span className="text-accent">FORMA.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/novo"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-body-small font-medium text-white transition-colors hover:bg-accent-dark"
          >
            <Plus size={16} />
            Novo produto
          </Link>
          <button
            type="button"
            onClick={logout}
            aria-label="Sair do painel"
            className="inline-flex size-10 items-center justify-center rounded-md border border-strong text-secondary transition-colors hover:border-error hover:text-error"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-lg border border-border-subtle bg-surface">
        {loading ? (
          <p className="px-6 py-16 text-center text-body-small text-tertiary">
            Carregando produtos…
          </p>
        ) : products.length === 0 ? (
          <p className="px-6 py-16 text-center text-body-small text-tertiary">
            Nenhum produto cadastrado ainda. Clique em “Novo produto”.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {products.map((product) => (
              <li key={product.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface-muted">
                  <Image
                    src={product.images[0]?.url ?? ""}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-small font-medium">{product.name}</p>
                  <p className="text-caption uppercase text-tertiary">
                    {product.category} · {formatPrice(product.price)}
                    {product.price === 0 && product.originalPrice == null ? " (sob consulta)" : ""}
                  </p>
                </div>

                <div className="hidden gap-1.5 sm:flex">
                  {product.isFeatured && (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-micro uppercase text-accent">
                      Destaque
                    </span>
                  )}
                  {!product.isAvailable && (
                    <span className="rounded-full bg-error/10 px-2.5 py-1 text-micro uppercase text-error">
                      Indisponível
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/admin/${product.id}/editar`}
                    aria-label={`Editar ${product.name}`}
                    className="flex size-9 items-center justify-center rounded-md border border-strong text-secondary transition-colors hover:border-accent hover:text-accent"
                  >
                    <Pencil size={15} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(product)}
                    disabled={deleting === product.id}
                    aria-label={`Remover ${product.name}`}
                    className="flex size-9 items-center justify-center rounded-md border border-strong text-secondary transition-colors hover:border-error hover:text-error disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
