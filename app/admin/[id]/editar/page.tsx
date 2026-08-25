"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getToken, listProducts } from "@/lib/admin-api";
import { ProductForm } from "@/components/admin/product-form";
import type { Product } from "@/types/product";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    listProducts()
      .then((rows) => {
        const found = rows.find((item) => item.id === params.id) ?? null;
        setProduct(found);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [router, params.id]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-body-small text-secondary transition-colors hover:text-accent"
      >
        <ArrowLeft size={15} />
        Voltar ao painel
      </Link>
      <h1 className="mt-6 font-display text-heading-2 tracking-tight">
        Editar produto
      </h1>

      {loading ? (
        <p className="mt-10 text-body-small text-tertiary">Carregando…</p>
      ) : product ? (
        <ProductForm product={product} />
      ) : (
        <p className="mt-10 text-body-small text-error">
          Produto não encontrado.
        </p>
      )}
    </div>
  );
}
