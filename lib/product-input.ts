import type { ProductInput } from "@/lib/admin-api";

/** Aceita "1.299,90", "1299.9" ou "1299" e devolve centavos. */
export function parsePriceToCents(value: string): number {
  const cleaned = value.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  return Math.round(parseFloat(normalized) * 100) || 0;
}

export function centsToInput(cents?: number): string {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** A API exige descrição curta; o drawer só pede a longa. */
export function summarize(description: string, max = 140): string {
  const text = description.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * As mesmas regras que a API aplica no DTO, checadas antes do POST para a
 * pessoa ver o erro no campo em vez de um 400 genérico.
 */
export function validateProductInput(input: ProductInput): string | null {
  if (!input.name || input.name.trim().length < 2) {
    return "O nome precisa de ao menos 2 caracteres.";
  }
  if (!input.description || input.description.trim().length < 10) {
    return "A descrição precisa de ao menos 10 caracteres.";
  }
  if (!input.shortDescription || input.shortDescription.trim().length < 5) {
    return "A descrição curta precisa de ao menos 5 caracteres.";
  }
  if (!input.images?.length) {
    return "Informe ao menos uma imagem (URL).";
  }
  return null;
}
