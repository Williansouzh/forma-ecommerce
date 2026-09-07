import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyCatalogFilters,
  type CatalogFilters,
} from "@/lib/catalog-filters";
import type { Product } from "@/types/product";

function make(overrides: Partial<Product> & { slug: string }): Product {
  return {
    id: overrides.slug,
    name: overrides.slug,
    description: "",
    shortDescription: "",
    price: 10000,
    category: "decoracao",
    tags: [],
    images: [],
    isAvailable: true,
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const filters = (over: Partial<CatalogFilters> = {}): CatalogFilters => ({
  ...DEFAULT_FILTERS,
  ...over,
});

describe("applyCatalogFilters — preço", () => {
  // Bordas meio-abertas: peça de R$ 50,00 exatos tem de aparecer em uma faixa
  // só. Faixa fechada dos dois lados faz a mesma peça surgir em dois filtros,
  // e a contagem de resultados deixa de fechar com a grade.
  const catalogo = [
    make({ slug: "a", price: 4999 }),
    make({ slug: "b", price: 5000 }),
    make({ slug: "c", price: 9999 }),
    make({ slug: "d", price: 10000 }),
    make({ slug: "e", price: 20000 }),
  ];

  it("não deixa lacuna nem sobreposição entre as faixas", () => {
    const faixas = ["ate50", "50a100", "100a200", "acima200"] as const;
    const vistos = faixas.flatMap((price) =>
      applyCatalogFilters(catalogo, filters({ price })).map((p) => p.slug)
    );
    expect([...vistos].sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("põe R$ 50,00 exatos na faixa de cima, não na de baixo", () => {
    const ate50 = applyCatalogFilters(catalogo, filters({ price: "ate50" }));
    expect(ate50.map((p) => p.slug)).toEqual(["a"]);
  });

  it("esconde peça sob consulta de qualquer faixa de preço", () => {
    const comConsulta = [...catalogo, make({ slug: "orcamento", price: 0 })];
    const slugs = (["ate50", "50a100", "100a200", "acima200"] as const).flatMap(
      (price) =>
        applyCatalogFilters(comConsulta, filters({ price })).map((p) => p.slug)
    );
    expect(slugs).not.toContain("orcamento");
    expect(
      applyCatalogFilters(comConsulta, filters()).map((p) => p.slug)
    ).toContain("orcamento");
  });
});

describe("applyCatalogFilters — prazo", () => {
  const catalogo = [
    make({ slug: "rapida", productionTime: 3 }),
    make({ slug: "media", productionTime: 5 }),
    make({ slug: "lenta", productionTime: 7 }),
    make({ slug: "sem-prazo" }),
  ];

  it("inclui o limite e corta acima dele", () => {
    const ate3 = applyCatalogFilters(catalogo, filters({ deadline: "ate3" }));
    expect(ate3.map((p) => p.slug)).toEqual(["rapida"]);
  });

  it("exclui peça sem prazo declarado — não dá para prometer prazo nenhum", () => {
    const ate5 = applyCatalogFilters(catalogo, filters({ deadline: "ate5" }));
    expect(ate5.map((p) => p.slug)).not.toContain("sem-prazo");
  });

  it("mantém a peça sem prazo quando o filtro está desligado", () => {
    expect(
      applyCatalogFilters(catalogo, filters()).map((p) => p.slug)
    ).toContain("sem-prazo");
  });
});

describe("applyCatalogFilters — ordenação", () => {
  const catalogo = [
    make({ slug: "velha", price: 3000, createdAt: "2025-01-01T00:00:00.000Z" }),
    make({ slug: "nova", price: 9000, createdAt: "2026-06-01T00:00:00.000Z" }),
    make({ slug: "meio", price: 6000, createdAt: "2025-08-01T00:00:00.000Z" }),
  ];

  it("ordena por preço nos dois sentidos", () => {
    expect(
      applyCatalogFilters(catalogo, filters({ sort: "menor" })).map((p) => p.price)
    ).toEqual([3000, 6000, 9000]);
    expect(
      applyCatalogFilters(catalogo, filters({ sort: "maior" })).map((p) => p.price)
    ).toEqual([9000, 6000, 3000]);
  });

  // A regressão que o `list.reverse()` anterior escondia: invertida, a lista
  // acima devolveria "meio, nova, velha" e o controle mentiria.
  it("ordena novidades por data, não invertendo a lista", () => {
    expect(
      applyCatalogFilters(catalogo, filters({ sort: "novo" })).map((p) => p.slug)
    ).toEqual(["nova", "meio", "velha"]);
  });

  it("trata data inválida como a mais antiga, sem quebrar", () => {
    const comLixo = [...catalogo, make({ slug: "quebrada", createdAt: "nao-e-data" })];
    const ordenado = applyCatalogFilters(comLixo, filters({ sort: "novo" }));
    expect(ordenado.at(-1)?.slug).toBe("quebrada");
  });

  it("não muta a lista recebida", () => {
    const entrada = [...catalogo];
    const antes = entrada.map((p) => p.slug);
    applyCatalogFilters(entrada, filters({ sort: "maior" }));
    expect(entrada.map((p) => p.slug)).toEqual(antes);
  });
});

describe("activeFilterCount", () => {
  it("conta só preço e prazo — ordenação não é filtro", () => {
    expect(activeFilterCount(filters())).toBe(0);
    expect(activeFilterCount(filters({ sort: "maior" }))).toBe(0);
    expect(activeFilterCount(filters({ price: "ate50" }))).toBe(1);
    expect(
      activeFilterCount(filters({ price: "ate50", deadline: "ate3" }))
    ).toBe(2);
  });
});
