import {
  effectOnFirstSight,
  isStaleTransition,
  mapShopeeStatus,
  SHOPEE_ORDER_STATUSES,
  SHOPEE_STATUS_MAP,
} from "./shopee-status.map";

describe("mapeamento de status da Shopee", () => {
  it("todo status conhecido tem destino interno e efeito declarado", () => {
    for (const status of SHOPEE_ORDER_STATUSES) {
      const mapping = SHOPEE_STATUS_MAP[status];
      expect(mapping.internal).toBeTruthy();
      expect(mapping.effect).toBeTruthy();
      expect(mapping.note.length).toBeGreaterThan(10);
    }
  });

  it("status desconhecido não é adivinhado", () => {
    expect(mapShopeeStatus("QUALQUER_COISA")).toBeNull();
  });

  /**
   * A decisão central da integração: a baixa acontece em READY_TO_SHIP, e
   * EXATAMENTE UMA VEZ no ciclo normal. Se alguém acrescentar um segundo
   * `confirm` ao mapa, este teste quebra antes de o estoque quebrar.
   */
  it("apenas READY_TO_SHIP e RETRY_SHIP baixam estoque", () => {
    const confirming = SHOPEE_ORDER_STATUSES.filter(
      (status) => SHOPEE_STATUS_MAP[status].effect === "confirm",
    );
    expect(confirming).toEqual(["READY_TO_SHIP", "RETRY_SHIP"]);
  });

  it("os estados posteriores à baixa não mexem no estoque", () => {
    for (const status of ["PROCESSED", "SHIPPED", "TO_CONFIRM_RECEIVE", "COMPLETED"] as const) {
      expect(SHOPEE_STATUS_MAP[status].effect).toBe("none");
    }
  });

  /**
   * `IN_CANCEL` é cancelamento PEDIDO, não aceito. Soltar o estoque aqui o
   * devolveria à venda enquanto o pedido ainda pode seguir — e aí duas
   * pessoas teriam comprado a mesma peça.
   */
  it("IN_CANCEL não libera estoque; só CANCELLED libera", () => {
    expect(SHOPEE_STATUS_MAP.IN_CANCEL.effect).toBe("none");
    expect(SHOPEE_STATUS_MAP.CANCELLED.effect).toBe("release");
  });
});

describe("isStaleTransition", () => {
  it("aceita a primeira transição de um pedido novo", () => {
    expect(isStaleTransition(undefined, "READY_TO_SHIP")).toBe(false);
  });

  it("aceita avanço no ciclo", () => {
    expect(isStaleTransition("READY_TO_SHIP", "SHIPPED")).toBe(false);
  });

  it("descarta evento que chega atrasado", () => {
    expect(isStaleTransition("SHIPPED", "READY_TO_SHIP")).toBe(true);
    expect(isStaleTransition("COMPLETED", "PROCESSED")).toBe(true);
  });

  it("aceita repetição do mesmo status (a idempotência é de outra camada)", () => {
    expect(isStaleTransition("SHIPPED", "SHIPPED")).toBe(false);
  });

  /** Cancelar um pedido já enviado é legítimo e não pode ser descartado. */
  it("cancelamento e devolução nunca são considerados atrasados", () => {
    expect(isStaleTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(isStaleTransition("SHIPPED", "TO_RETURN")).toBe(false);
    expect(isStaleTransition("READY_TO_SHIP", "IN_CANCEL")).toBe(false);
  });

  /** Depois de um terminal, um evento do ciclo normal chegou tarde demais. */
  it("descarta evento do ciclo normal que chega depois de um terminal", () => {
    expect(isStaleTransition("CANCELLED", "SHIPPED")).toBe(true);
  });
});

describe("effectOnFirstSight", () => {
  it("mantém o efeito do mapa quando ele já existe", () => {
    expect(effectOnFirstSight("UNPAID")).toBe("reserve");
    expect(effectOnFirstSight("READY_TO_SHIP")).toBe("confirm");
    expect(effectOnFirstSight("CANCELLED")).toBe("release");
    expect(effectOnFirstSight("TO_RETURN")).toBe("restock");
  });

  /**
   * O buraco que isto tapa: um pedido descoberto já em SHIPPED nunca passou
   * pelo `confirm`, e sem esta regra o saldo ficaria inflado para sempre —
   * a conciliação empurraria o número errado para a Shopee, não o contrário.
   */
  it("baixa o estoque de pedido descoberto já adiantado no ciclo", () => {
    for (const status of ["PROCESSED", "SHIPPED", "TO_CONFIRM_RECEIVE", "COMPLETED"] as const) {
      expect(effectOnFirstSight(status)).toBe("confirm");
    }
  });

  it("não baixa em estados anteriores ao pagamento nem em cancelamento pedido", () => {
    expect(effectOnFirstSight("INVOICE_PENDING")).toBe("reserve");
    expect(effectOnFirstSight("IN_CANCEL")).toBe("none");
  });
});
