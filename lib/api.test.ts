import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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

/**
 * `fetchProducts` e o catálogo local.
 *
 * O bug real que estes casos travam: o catálogo de demonstração aparecia na
 * loja MESMO com a API respondendo — bastava um produto de demonstração ter
 * um slug que não existisse no banco real, e ele nunca saía de circulação.
 * Em produção, a loja com um produto de verdade no painel mostrava esse
 * produto ao lado das nove peças de mentira do catálogo local.
 *
 * A regra correta: o catálogo local é reserva de FALHA, não complemento
 * permanente. Com a API respondendo — mesmo com uma lista vazia — o que ela
 * diz é a verdade inteira.
 */
describe("fetchProducts — quando o catálogo local entra", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("API respondendo com um produto só: mostra só ele, sem completar com demonstração", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.teste");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "real-1",
          slug: "peca-de-verdade",
          name: "Peça de verdade",
          description: "d",
          shortDescription: "s",
          price: 1000,
          category: "decoracao",
          tags: [],
          images: [{ url: "/a.jpg", alt: "a" }],
          variants: [],
          isAvailable: true,
          isFeatured: false,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
    }) as unknown as typeof fetch;

    const { fetchProducts } = await import("./api");
    const products = await fetchProducts();

    expect(products).toHaveLength(1);
    expect(products[0].slug).toBe("peca-de-verdade");
  });

  it("API respondendo vazia: a loja fica vazia, não substitui por demonstração", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.teste");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as unknown as typeof fetch;

    const { fetchProducts } = await import("./api");
    expect(await fetchProducts()).toEqual([]);
  });

  it("API fora do ar: cai para o catálogo de demonstração", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.teste");
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;

    const { fetchProducts } = await import("./api");
    const { PRODUCTS } = await import("@/data/products");
    const products = await fetchProducts();

    expect(products.length).toBe(PRODUCTS.length);
    expect(products.map((p) => p.slug).sort()).toEqual(
      PRODUCTS.map((p) => p.slug).sort(),
    );
  });

  it("API respondendo com erro HTTP: cai para o catálogo de demonstração", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.teste");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    const { fetchProducts } = await import("./api");
    const { PRODUCTS } = await import("@/data/products");
    expect(await fetchProducts()).toHaveLength(PRODUCTS.length);
  });
});
