"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getToken } from "@/lib/admin-api";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/admin/login");
  }, [router]);

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
        Novo produto
      </h1>
      <ProductForm />
    </div>
  );
}
