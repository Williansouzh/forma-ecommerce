import type { Metadata } from "next";
import { SearchPageClient } from "./search-client";

export const metadata: Metadata = {
  title: "Busca",
  description: "Encontre peças por nome, categoria ou tag no catálogo FORMA.",
  robots: { index: false },
};

export default function BuscaPage() {
  return <SearchPageClient />;
}
