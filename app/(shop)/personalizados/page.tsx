import type { Metadata } from "next";
import { PersonalizadosClient } from "./personalizados-client";

export const metadata: Metadata = {
  title: "Personalizados",
  description:
    "Peças 3D personalizadas: sua ideia modelada do zero, com aprovação em cada etapa. Orçamento em até 2 dias úteis.",
  alternates: { canonical: "/personalizados" },
};

export default function PersonalizadosPage() {
  return <PersonalizadosClient />;
}
