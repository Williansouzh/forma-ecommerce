import { availableStock, publishableStock } from "./publishable-stock";

describe("availableStock", () => {
  it("tira do físico o reservado e o vencido", () => {
    expect(availableStock({ onHand: 10, reserved: 3, expired: 2 })).toBe(5);
  });

  /**
   * A invariante que protege o marketplace: nunca anunciar número negativo.
   * Um saldo negativo vindo de uma divergência viraria estoque negativo na
   * Shopee, e a API recusaria a chamada inteira.
   */
  it("nunca fica negativo", () => {
    expect(availableStock({ onHand: 2, reserved: 5, expired: 0 })).toBe(0);
  });
});

describe("publishableStock", () => {
  it("aplica a margem de segurança sobre o disponível", () => {
    expect(publishableStock({ onHand: 10, reserved: 0, expired: 0 }, 2)).toBe(8);
  });

  /**
   * Margem maior que o saldo é o caso que a margem existe para cobrir: com 2
   * peças e margem 3, o certo é anunciar esgotado — não -1.
   */
  it("zera quando a margem passa do disponível", () => {
    expect(publishableStock({ onHand: 2, reserved: 0, expired: 0 }, 3)).toBe(0);
  });

  it("conta o reservado e o vencido antes da margem", () => {
    expect(publishableStock({ onHand: 10, reserved: 4, expired: 1 }, 2)).toBe(3);
  });

  it("trata margem negativa como zero, em vez de vender o que não há", () => {
    expect(publishableStock({ onHand: 5, reserved: 0, expired: 0 }, -3)).toBe(5);
  });

  it("ignora margem quebrada em vez de propagar NaN para a Shopee", () => {
    expect(publishableStock({ onHand: 5, reserved: 0, expired: 0 }, Number.NaN)).toBe(5);
    expect(publishableStock({ onHand: 5, reserved: 0, expired: 0 }, 1.7)).toBe(4);
  });
});
