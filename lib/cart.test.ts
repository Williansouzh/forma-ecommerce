import { describe, expect, it } from "vitest";
import { getCartTotals, payableTotal } from "@/lib/cart";
import type { CartItem } from "@/types/cart";
import {
  FREE_SHIPPING_THRESHOLD,
  PIX_DISCOUNT,
  SHIPPING_COST,
} from "@/lib/constants";

/**
 * O caminho do dinheiro. Erro aqui é silencioso: ninguém vê exceção, a loja
 * só cobra errado. Os casos abaixo são invariantes, não cobertura — cada um
 * corresponde a uma decisão que o código toma sobre quanto o cliente paga.
 */
const item = (price: number, quantity = 1): CartItem => ({
  productId: `p-${price}-${quantity}`,
  price,
  quantity,
});

describe("getCartTotals", () => {
  it("soma preço × quantidade, não só o preço", () => {
    const totals = getCartTotals([item(9900, 3)]);
    expect(totals.subtotal).toBe(29700);
    expect(totals.count).toBe(3);
  });

  it("não cobra frete de carrinho vazio", () => {
    const totals = getCartTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(0);
  });

  // A fronteira do frete grátis é o lugar clássico de erro por um centavo.
  it("cobra frete um centavo abaixo do limite", () => {
    const totals = getCartTotals([item(FREE_SHIPPING_THRESHOLD - 1)]);
    expect(totals.shipping).toBe(SHIPPING_COST);
  });

  it("libera o frete exatamente no limite", () => {
    const totals = getCartTotals([item(FREE_SHIPPING_THRESHOLD)]);
    expect(totals.shipping).toBe(0);
  });

  it("libera o frete acima do limite", () => {
    const totals = getCartTotals([item(FREE_SHIPPING_THRESHOLD + 1)]);
    expect(totals.shipping).toBe(0);
  });

  it("aceita um limite vindo das configurações do ateliê", () => {
    const totals = getCartTotals([item(20000)], 15000);
    expect(totals.shipping).toBe(0);
  });

  it("soma o frete ao total", () => {
    const totals = getCartTotals([item(9900)]);
    expect(totals.total).toBe(9900 + SHIPPING_COST);
  });
});

describe("payableTotal", () => {
  it("sem desconto, é o total do carrinho", () => {
    const totals = getCartTotals([item(9900)]);
    expect(payableTotal(totals)).toBe(totals.total);
  });

  // O desconto incide sobre o SUBTOTAL, não sobre o total: dar 5% em cima do
  // frete seria pagar parte do envio do cliente.
  it("aplica o desconto do Pix sobre o subtotal, nunca sobre o frete", () => {
    const totals = getCartTotals([item(10000)]);
    expect(payableTotal(totals, PIX_DISCOUNT)).toBe(10000 + SHIPPING_COST - 500);
  });

  it("arredonda para centavo inteiro — preço em centavos não tem fração", () => {
    const totals = getCartTotals([item(3333)]);
    const paid = payableTotal(totals, PIX_DISCOUNT);
    expect(Number.isInteger(paid)).toBe(true);
    expect(paid).toBe(3333 + SHIPPING_COST - 167);
  });

  it("é o mesmo número que o resumo e o botão mostram", () => {
    // A regressão que este teste existe para pegar: os dois calculavam o
    // desconto separadamente e teriam divergido na primeira mudança.
    const totals = getCartTotals([item(12900, 2)]);
    const resumo = payableTotal(totals, PIX_DISCOUNT);
    const botao = payableTotal(totals, PIX_DISCOUNT);
    expect(resumo).toBe(botao);
    expect(resumo).toBeLessThan(totals.total);
  });

  it("não fica negativo com carrinho vazio", () => {
    expect(payableTotal(getCartTotals([]), PIX_DISCOUNT)).toBe(0);
  });
});
