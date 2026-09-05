import { describe, expect, it } from "vitest";
import { availabilityNote } from "@/lib/product-availability";
import type { Product } from "@/types/product";

/**
 * A frase que decide a compra. Errar aqui promete ao cliente um prazo que o
 * ateliê não cumpre — o tipo de erro que só aparece na reclamação.
 */
const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "p1",
    slug: "peca",
    name: "Peça",
    description: "",
    shortDescription: "",
    price: 9900,
    category: "decoracao",
    tags: [],
    images: [],
    isAvailable: true,
    isFeatured: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  }) as Product;

describe("availabilityNote", () => {
  it("diz esgotado quando a peça não está disponível", () => {
    expect(availabilityNote(product({ isAvailable: false }))).toBe("Esgotado");
  });

  it("diz esgotado com estoque zero, mesmo marcada como disponível", () => {
    expect(availabilityNote(product({ stock: 0 }))).toBe("Esgotado");
  });

  it("preço zero é orçamento, não peça de graça", () => {
    expect(availabilityNote(product({ price: 0 }))).toBe("Sob encomenda");
  });

  it("singulariza a última peça", () => {
    expect(availabilityNote(product({ stock: 1 }))).toBe("Última peça");
  });

  it("avisa escassez a partir de três unidades", () => {
    expect(availabilityNote(product({ stock: 3 }))).toBe("Últimas 3 unidades");
  });

  it("acima de três, mostra o prazo em vez da escassez", () => {
    expect(availabilityNote(product({ stock: 4, productionTime: 4 }))).toBe(
      "Pronto em 4 dias",
    );
  });

  // A regra é da CATEGORIA, não do `isCustom`: uma tag com nome é
  // personalizada e mesmo assim sai do estoque de branco em dois dias.
  it("só a categoria personalizados usa a redação de encomenda", () => {
    expect(
      availabilityNote(
        product({ category: "personalizados", productionTime: 5 }),
      ),
    ).toBe("Feito depois do seu pedido — 5 dias");
  });

  it("peça personalizável fora da categoria mantém o prazo normal", () => {
    expect(
      availabilityNote(
        product({ category: "presentes", isCustom: true, productionTime: 2 }),
      ),
    ).toBe("Pronto em 2 dias");
  });

  it("sem prazo cadastrado, não inventa um", () => {
    expect(availabilityNote(product())).toBeNull();
  });
});
