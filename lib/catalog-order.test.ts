import { describe, expect, it } from "vitest";
import { inCatalogOrder } from "@/lib/catalog-order";
import { PRODUCTS } from "@/data/products";
import type { Product } from "@/types/product";

/**
 * A ordem da vitrine é decisão editorial: o primeiro slot é o maior. Deixar
 * o Mongo escolher quem o ocupa entrega destaque a peça aleatória.
 */
describe("inCatalogOrder", () => {
  it("devolve na ordem do catálogo, não na de entrada", () => {
    const embaralhado = [...PRODUCTS].reverse();
    const ordenado = inCatalogOrder(embaralhado);
    expect(ordenado.map((p) => p.slug)).toEqual(PRODUCTS.map((p) => p.slug));
  });

  it("não muta a lista recebida", () => {
    const entrada = [...PRODUCTS].reverse();
    const antes = entrada.map((p) => p.slug);
    inCatalogOrder(entrada);
    expect(entrada.map((p) => p.slug)).toEqual(antes);
  });

  // Peça criada pelo painel ainda não existe em `data/products.ts`. Sumir com
  // ela seria pior que mostrá-la fora de ordem.
  it("mantém peça desconhecida, jogando-a para o fim", () => {
    const nova = { ...PRODUCTS[0], slug: "peca-nova-do-painel" } as Product;
    const ordenado = inCatalogOrder([nova, PRODUCTS[1], PRODUCTS[0]]);
    expect(ordenado.map((p) => p.slug)).toEqual([
      PRODUCTS[0].slug,
      PRODUCTS[1].slug,
      "peca-nova-do-painel",
    ]);
  });

  it("lida com lista vazia", () => {
    expect(inCatalogOrder([])).toEqual([]);
  });
});
