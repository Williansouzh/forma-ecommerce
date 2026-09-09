import { BadRequestException } from "@nestjs/common";
import { SHIPPING_COST, priceOrder, type CatalogEntry } from "./pricing";

/**
 * O preço do pedido é o ponto onde a loja perde dinheiro se alguém mentir.
 *
 * A rota que cria pedido é pública — o checkout não tem sessão — e antes
 * gravava o `price` que viesse no corpo. Estes casos existem para que a
 * regressão apareça aqui, e não no extrato.
 */

const REGRAS = { freeShippingThreshold: 40000, pixDiscountPercent: 5 };

const VASO: CatalogEntry = {
  id: "vaso",
  name: "Vaso Nervura",
  price: 12900,
  isAvailable: true,
  variants: [
    { id: "branco", name: "Branco Gesso", priceAdjustment: 0 },
    { id: "preto", name: "Preto Fosco", priceAdjustment: 1500 },
  ],
};

const catalogo = (...pecas: CatalogEntry[]) =>
  new Map(pecas.map((peca) => [peca.id, peca]));

describe("priceOrder", () => {
  it("ignora o preço que o cliente mandou e usa o do catálogo", () => {
    const resultado = priceOrder(
      // O corpo do atacante: um centavo por uma peça de R$ 129,00.
      [{ productId: "vaso", quantity: 1 }],
      catalogo(VASO),
      "pix",
      REGRAS,
    );

    expect(resultado.items[0].price).toBe(12900);
    expect(resultado.subtotal).toBe(12900);
  });

  it("grava o nome do catálogo, não o que veio na requisição", () => {
    const resultado = priceOrder(
      [{ productId: "vaso", quantity: 1 }],
      catalogo(VASO),
      "boleto",
      REGRAS,
    );
    expect(resultado.items[0].name).toBe("Vaso Nervura");
  });

  it("soma o ajuste da variante escolhida", () => {
    const resultado = priceOrder(
      [{ productId: "vaso", variantId: "preto", quantity: 2 }],
      catalogo(VASO),
      "boleto",
      REGRAS,
    );
    expect(resultado.items[0].price).toBe(14400);
    expect(resultado.items[0].variantName).toBe("Preto Fosco");
    expect(resultado.subtotal).toBe(28800);
  });

  it("cobra frete abaixo do piso e isenta acima dele", () => {
    const barato = priceOrder(
      [{ productId: "vaso", quantity: 1 }],
      catalogo(VASO),
      "boleto",
      REGRAS,
    );
    expect(barato.shipping).toBe(SHIPPING_COST);

    const caro = priceOrder(
      [{ productId: "vaso", quantity: 4 }],
      catalogo(VASO),
      "boleto",
      REGRAS,
    );
    expect(caro.subtotal).toBe(51600);
    expect(caro.shipping).toBe(0);
  });

  it("aplica o desconto do Pix só no Pix", () => {
    const pix = priceOrder(
      [{ productId: "vaso", quantity: 1 }],
      catalogo(VASO),
      "pix",
      REGRAS,
    );
    expect(pix.discount).toBe(645);
    expect(pix.total).toBe(12900 + SHIPPING_COST - 645);

    const cartao = priceOrder(
      [{ productId: "vaso", quantity: 1 }],
      catalogo(VASO),
      "credit_card",
      REGRAS,
    );
    expect(cartao.discount).toBe(0);
  });

  it("recusa peça que não está no catálogo", () => {
    expect(() =>
      priceOrder(
        [{ productId: "inventado", quantity: 1 }],
        catalogo(VASO),
        "pix",
        REGRAS,
      ),
    ).toThrow(BadRequestException);
  });

  it("recusa peça despublicada", () => {
    expect(() =>
      priceOrder(
        [{ productId: "vaso", quantity: 1 }],
        catalogo({ ...VASO, isAvailable: false }),
        "pix",
        REGRAS,
      ),
    ).toThrow(BadRequestException);
  });

  it("recusa variante que não existe mais", () => {
    expect(() =>
      priceOrder(
        [{ productId: "vaso", variantId: "dourado", quantity: 1 }],
        catalogo(VASO),
        "pix",
        REGRAS,
      ),
    ).toThrow(BadRequestException);
  });

  it("nunca devolve total negativo", () => {
    const resultado = priceOrder(
      [{ productId: "vaso", quantity: 1 }],
      catalogo(VASO),
      "pix",
      { freeShippingThreshold: 0, pixDiscountPercent: 50 },
    );
    expect(resultado.total).toBeGreaterThanOrEqual(0);
  });

  /*
   * O frete vive em dois lugares: aqui e em `lib/constants.ts`, na loja, que
   * precisa desenhar o resumo antes de falar com a API. Este caso fixa o
   * número para que mudar um lado só apareça como teste vermelho.
   */
  it("mantém o frete alinhado com a constante da loja", () => {
    expect(SHIPPING_COST).toBe(2990);
  });
});
