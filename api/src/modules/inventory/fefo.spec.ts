import {
  expiredRemaining,
  planFefoConsumption,
  remainingOf,
  sortForFefo,
  type FefoBatch,
} from "./fefo";

const BASE = new Date("2026-09-01T00:00:00Z");

function batch(over: Partial<FefoBatch> & { id: string }): FefoBatch {
  return {
    quantity: 10,
    consumed: 0,
    lost: 0,
    unitCost: 1000,
    expiresAt: null,
    createdAt: BASE,
    ...over,
  };
}

describe("sortForFefo", () => {
  /**
   * O caso que a ordenação ingênua erra. `undefined`/`null` compara como
   * MENOR que qualquer data, então `sort((a,b) => a-b)` cru colocaria o lote
   * que nunca vence na frente — e a loja gastaria o lote eterno enquanto o
   * lote que vence amanhã apodrece na prateleira.
   */
  it("põe o lote sem validade por último", () => {
    const ordered = sortForFefo([
      batch({ id: "eterno" }),
      batch({ id: "vence-tarde", expiresAt: new Date("2026-12-01") }),
      batch({ id: "vence-cedo", expiresAt: new Date("2026-10-01") }),
    ]);
    expect(ordered.map((b) => b.id)).toEqual(["vence-cedo", "vence-tarde", "eterno"]);
  });

  it("desempata lotes de mesma validade pela ordem de entrada", () => {
    const ordered = sortForFefo([
      batch({ id: "novo", expiresAt: new Date("2026-10-01"), createdAt: new Date("2026-09-05") }),
      batch({ id: "velho", expiresAt: new Date("2026-10-01"), createdAt: new Date("2026-09-01") }),
    ]);
    expect(ordered.map((b) => b.id)).toEqual(["velho", "novo"]);
  });
});

describe("planFefoConsumption", () => {
  it("consome o lote que vence primeiro", () => {
    const plan = planFefoConsumption(
      [
        batch({ id: "eterno" }),
        batch({ id: "vence-cedo", quantity: 3, expiresAt: new Date("2026-10-01") }),
      ],
      2,
      BASE,
    );
    expect(plan.slices).toEqual([{ batchId: "vence-cedo", quantity: 2, unitCost: 1000 }]);
    expect(plan.shortfall).toBe(0);
  });

  it("atravessa lotes quando um não basta, e soma o COGS de cada um", () => {
    const plan = planFefoConsumption(
      [
        batch({ id: "a", quantity: 2, unitCost: 500, expiresAt: new Date("2026-10-01") }),
        batch({ id: "b", quantity: 5, unitCost: 900, expiresAt: new Date("2026-11-01") }),
      ],
      4,
      BASE,
    );
    expect(plan.slices).toEqual([
      { batchId: "a", quantity: 2, unitCost: 500 },
      { batchId: "b", quantity: 2, unitCost: 900 },
    ]);
    // O custo é o do LOTE, não um preço médio: 2×500 + 2×900.
    expect(plan.cogs).toBe(2800);
  });

  /** O caso 19 do enunciado, na camada pura. */
  it("ignora lote vencido mesmo com peça sobrando nele", () => {
    const plan = planFefoConsumption(
      [batch({ id: "vencido", quantity: 10, expiresAt: new Date("2026-08-01") })],
      1,
      BASE,
    );
    expect(plan.slices).toEqual([]);
    expect(plan.shortfall).toBe(1);
  });

  it("desconta o que já saiu do lote", () => {
    const plan = planFefoConsumption([batch({ id: "a", quantity: 10, consumed: 7, lost: 2 })], 3, BASE);
    expect(plan.slices).toEqual([{ batchId: "a", quantity: 1, unitCost: 1000 }]);
    expect(plan.shortfall).toBe(2);
  });

  it("não inventa saída quando pedem zero", () => {
    expect(planFefoConsumption([batch({ id: "a" })], 0, BASE)).toEqual({
      slices: [],
      cogs: 0,
      shortfall: 0,
    });
  });
});

describe("remainingOf / expiredRemaining", () => {
  it("nunca devolve restante negativo", () => {
    expect(remainingOf(batch({ id: "a", quantity: 5, consumed: 5, lost: 3 }))).toBe(0);
  });

  it("soma só o que está preso em lote vencido", () => {
    const total = expiredRemaining(
      [
        batch({ id: "vencido", quantity: 4, expiresAt: new Date("2026-08-01") }),
        batch({ id: "valido", quantity: 9, expiresAt: new Date("2026-10-01") }),
      ],
      BASE,
    );
    expect(total).toBe(4);
  });
});
