"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";

/*
 * Sem checagem de sessão aqui: o token virou cookie `httpOnly` e o JavaScript
 * não tem como olhá-lo. Quem desvia para o login é o `AdminDataProvider`, que
 * envolve esta tela e já trata o 401 — uma checagem só, no lugar de três
 * cópias que podiam divergir.
 */
export default function NewProductPage() {
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
