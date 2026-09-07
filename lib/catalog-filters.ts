import type { Product } from "@/types/product";
import { inCatalogOrder } from "@/lib/catalog-order";

export type SortOption = "destaque" | "menor" | "maior" | "novo";
export type PriceOption = "todos" | "ate50" | "50a100" | "100a200" | "acima200";
export type DeadlineOption = "qualquer" | "ate3" | "ate5";

export interface CatalogFilters {
  price: PriceOption;
  deadline: DeadlineOption;
  sort: SortOption;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  price: "todos",
  deadline: "qualquer",
  sort: "destaque",
};

/**
 * Faixas em centavos, como o resto da loja.
 *
 * As bordas são meio-abertas — `min` inclusivo, `max` exclusivo — para que
 * R$ 50,00 exato caia em "R$ 50 a R$ 100" e em nenhum outro lugar. Faixa com
 * as duas bordas fechadas deixa peça aparecendo em dois filtros.
 */
export const PRICES: {
  value: PriceOption;
  label: string;
  min: number;
  max: number;
}[] = [
  { value: "todos", label: "Qualquer preço", min: 0, max: Infinity },
  { value: "ate50", label: "Até R$ 50", min: 0, max: 5000 },
  { value: "50a100", label: "R$ 50 a R$ 100", min: 5000, max: 10000 },
  { value: "100a200", label: "R$ 100 a R$ 200", min: 10000, max: 20000 },
  { value: "acima200", label: "Acima de R$ 200", min: 20000, max: Infinity },
];

/*
 * O recorte é prazo, não "pronta para enviar": aqui nada fica em estoque
 * parado, então uma opção dessas mentiria. Quem compra presente compra com
 * data — o prazo é o filtro que essa pessoa de fato usa.
 */
export const DEADLINES: {
  value: DeadlineOption;
  label: string;
  maxDays: number;
}[] = [
  { value: "qualquer", label: "Qualquer prazo", maxDays: Infinity },
  { value: "ate3", label: "Fica pronta em até 3 dias", maxDays: 3 },
  { value: "ate5", label: "Fica pronta em até 5 dias", maxDays: 5 },
];

export const SORTS: { value: SortOption; label: string }[] = [
  { value: "destaque", label: "Destaque" },
  { value: "menor", label: "Menor preço" },
  { value: "maior", label: "Maior preço" },
  { value: "novo", label: "Novidades" },
];

/** Data de criação em número, tolerante a string, Date e campo ausente. */
export function createdAtMs(product: Pick<Product, "createdAt">): number {
  const value = new Date(product.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

/** Quantos filtros estão ativos — vai para o selo do botão no celular. */
export function activeFilterCount(filters: CatalogFilters): number {
  return (
    (filters.price !== "todos" ? 1 : 0) +
    (filters.deadline !== "qualquer" ? 1 : 0)
  );
}

function matches(product: Product, filters: CatalogFilters): boolean {
  if (filters.price !== "todos") {
    const range = PRICES.find((item) => item.value === filters.price);
    if (!range) return true;
    // Peça sob consulta (preço 0) não cabe em faixa de preço nenhuma: o preço
    // dela ainda não existe, e mostrá-la em "até R$ 50" seria invenção.
    if (product.price === 0) return false;
    if (product.price < range.min || product.price >= range.max) return false;
  }

  if (filters.deadline !== "qualquer") {
    const limit = DEADLINES.find((item) => item.value === filters.deadline);
    if (!limit) return true;
    // Sem prazo declarado não dá para prometer prazo nenhum.
    if (typeof product.productionTime !== "number") return false;
    if (product.productionTime > limit.maxDays) return false;
  }

  return true;
}

/**
 * Filtra e ordena, sem tocar no array recebido.
 *
 * "Novidades" ordena por `createdAt`. Antes era `list.reverse()`, que só
 * coincide com "mais novo primeiro" se o catálogo estiver perfeitamente
 * ordenado por data — o que ninguém garante depois de editar um produto pelo
 * painel.
 */
export function applyCatalogFilters(
  products: Product[],
  filters: CatalogFilters
): Product[] {
  const list = products.filter((product) => matches(product, filters));

  switch (filters.sort) {
    case "menor":
      return list.sort((a, b) => a.price - b.price);
    case "maior":
      return list.sort((a, b) => b.price - a.price);
    case "novo":
      return list.sort((a, b) => createdAtMs(b) - createdAtMs(a));
    default:
      return inCatalogOrder(list);
  }
}
