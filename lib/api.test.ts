import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O contrato precisa descrever o que vai NO FIO.
 *
 * Os schemas do Mongoose declaram `_id`, mas o `toJSON` de cada um renomeia
 * para `id` antes de serializar. Quando o contrato saía com `_id`, a loja
 * compilava contra um campo que nunca chegava e montava `id: undefined` em
 * todo produto vindo da API — sem erro de tipo, sem erro de lint, sem tela
 * quebrada. Só um `key` de React indefinido e um item de carrinho sem
 * identidade.
 *
 * Mentira em contrato é pior que contrato nenhum: dá confiança falsa.
 */
const contrato = readFileSync(
  resolve(import.meta.dirname, "../types/generated/api-v1.d.ts"),
  "utf8",
);

describe("contrato gerado da API", () => {
  it("não expõe `_id` — o fio usa `id`", () => {
    const linhas = contrato
      .split("\n")
      .filter((linha) => /(^|\W)_id\b/.test(linha));
    expect(linhas).toEqual([]);
  });

  it("declara `id` no Product", () => {
    const bloco = contrato.slice(contrato.indexOf("Product: {"));
    expect(bloco.slice(0, 600)).toContain("id: string;");
  });

  // Se o contrato ficar vazio por erro de geração, os testes acima passariam
  // por vacuidade — este garante que há contrato de verdade.
  it("descreve as rotas que a loja consome", () => {
    for (const rota of ["/api/v1/products", "/api/v1/orders"]) {
      expect(contrato).toContain(rota);
    }
  });
});
