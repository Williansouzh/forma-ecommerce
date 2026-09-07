import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  LEGACY_CATEGORY_MAP,
  canonicalCategory,
  categoryColor,
  getCategory,
  storefrontCategories,
  withProductCounts,
} from "@/data/categories";
import { PRODUCTS } from "@/data/products";

describe("migração de taxonomia", () => {
  it("todo slug aposentado aponta para um canônico que existe", () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_CATEGORY_MAP)) {
      expect(
        CATEGORIES.some((category) => category.slug === canonical),
        `"${legacy}" aponta para "${canonical}", que não está em CATEGORIES`
      ).toBe(true);
    }
  });

  // Um slug que fosse legado e canônico ao mesmo tempo faria `canonicalCategory`
  // reescrever uma categoria viva.
  it("nenhum slug é aposentado e canônico ao mesmo tempo", () => {
    for (const legacy of Object.keys(LEGACY_CATEGORY_MAP)) {
      expect(CATEGORIES.some((category) => category.slug === legacy)).toBe(false);
    }
  });

  it("resolve slug aposentado e deixa o canônico intacto", () => {
    expect(canonicalCategory("geek")).toBe("colecionaveis");
    expect(canonicalCategory("utilidades")).toBe("decoracao");
    expect(canonicalCategory("decoracao")).toBe("decoracao");
    expect(canonicalCategory("inexistente")).toBe("inexistente");
  });

  // A URL /colecoes/geek está indexada e em link compartilhado: ela precisa
  // resolver para a categoria nova, não dar 404.
  it("getCategory ainda encontra a categoria por um slug aposentado", () => {
    expect(getCategory("geek")?.slug).toBe("colecionaveis");
    expect(getCategory("utilidades")?.slug).toBe("decoracao");
    expect(getCategory("nao-existe")).toBeUndefined();
  });

  it("dá cor de filamento também para slug aposentado", () => {
    expect(categoryColor("geek")).toEqual(categoryColor("colecionaveis"));
  });
});

describe("withProductCounts", () => {
  it("conta peça ainda gravada no slug antigo dentro da categoria nova", () => {
    const counts = withProductCounts([
      { category: "geek" },
      { category: "colecionaveis" },
      { category: "utilidades" },
      { category: "decoracao" },
    ]);
    const by = (slug: string) =>
      counts.find((category) => category.slug === slug)?.productCount;

    expect(by("colecionaveis")).toBe(2);
    expect(by("decoracao")).toBe(2);
  });

  it("não perde nenhuma peça do catálogo real", () => {
    const counts = withProductCounts(PRODUCTS);
    const total = counts.reduce((sum, item) => sum + item.productCount, 0);
    expect(total).toBe(PRODUCTS.length);
  });

  it("devolve todas as famílias, inclusive as que ainda não têm peça", () => {
    expect(withProductCounts([])).toHaveLength(CATEGORIES.length);
  });
});

describe("storefrontCategories", () => {
  it("esconde família sem peça — prateleira vazia lê como loja sem estoque", () => {
    const visiveis = storefrontCategories(withProductCounts(PRODUCTS));
    for (const category of visiveis) {
      if (category.slug === "personalizados") continue;
      expect(category.productCount).toBeGreaterThan(0);
    }
  });

  it("mantém Sob medida mesmo sem peça — encomenda não tem catálogo fechado", () => {
    const visiveis = storefrontCategories(withProductCounts([]));
    expect(visiveis.map((category) => category.slug)).toEqual(["personalizados"]);
  });

  it("faz a família nova aparecer sozinha quando ganha a primeira peça", () => {
    const antes = storefrontCategories(withProductCounts(PRODUCTS));
    expect(antes.map((c) => c.slug)).not.toContain("jogos");

    const depois = storefrontCategories(
      withProductCounts([...PRODUCTS, { category: "jogos" }])
    );
    expect(depois.map((c) => c.slug)).toContain("jogos");
  });
});

describe("catálogo local depois da migração", () => {
  it("nenhum produto ficou num slug aposentado", () => {
    const presos = PRODUCTS.filter(
      (product) => product.category in LEGACY_CATEGORY_MAP
    );
    expect(presos.map((p) => p.slug)).toEqual([]);
  });

  it("todo produto está numa categoria que existe", () => {
    for (const product of PRODUCTS) {
      expect(
        getCategory(product.category),
        `${product.slug} está em "${product.category}"`
      ).toBeDefined();
    }
  });
});
