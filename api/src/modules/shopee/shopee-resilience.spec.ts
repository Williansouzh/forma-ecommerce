import {
  createShopeeHarness,
  updateStockOk,
  SHOP_ID,
  type ShopeeHarness,
} from "../../test/shopee-harness";
import { shopeeErrors } from "../../test/fake-shopee-api";
import { STOCK_SYNC_TOPIC } from "./shopee-inventory.service";
import { backoffFor } from "../outbox/outbox.service";

/**
 * O que acontece quando a Shopee falha.
 *
 * A invariante que todos estes casos verificam é a mesma, e é a última linha
 * do enunciado: **erro da Shopee não corrompe estoque local**. O saldo, o
 * ledger e os lotes ficam exatamente como estavam; o que sobra é uma mensagem
 * na fila.
 */
describe("Resiliência da integração Shopee", () => {
  let h: ShopeeHarness;

  beforeAll(async () => {
    h = await createShopeeHarness("forma_test_shopee_res");
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(() => h.reset());

  // ── 11/12. Token expirado e renovação ────────────────────────────────

  it("renova o token vencido antes de chamar, sem erro visível", async () => {
    await h.integrations.update("shopee", {
      config: { tokenExpiresAt: Date.now() - 60_000 },
    });
    h.api.on("/auth/access_token/get", () => ({
      access_token: "token-novo",
      refresh_token: "refresh-novo",
      expire_in: 14_400,
    }));
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "800" });

    const result = await h.stock.syncOne({
      shopId: SHOP_ID,
      productId,
      variantId: "",
      correlationId: "c",
    });

    expect(result.ok).toBe(true);
    expect(h.api.callsTo("/auth/access_token/get")).toHaveLength(1);
    // A chamada saiu com o token NOVO, não com o vencido.
    expect(h.api.callsTo("/product/update_stock")[0].options.shop?.accessToken).toBe("token-novo");

    const connection = await h.auth.connection();
    expect(connection.connected).toBe(true);
    expect(connection.tokenExpiresInSeconds).toBeGreaterThan(3600);
  });

  it("renova e repete quando a Shopee recusa o token no meio da chamada", async () => {
    h.api.on("/auth/access_token/get", () => ({
      access_token: "token-renovado",
      refresh_token: "refresh-novo",
      expire_in: 14_400,
    }));
    h.api.on("/product/update_stock", () => updateStockOk());
    // O token vence ENTRE a checagem e a chamada: só a resposta denuncia.
    h.api.failNext("/product/update_stock", shopeeErrors.expiredToken());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "801" });

    const result = await h.stock.syncOne({
      shopId: SHOP_ID,
      productId,
      variantId: "",
      correlationId: "c",
    });

    expect(result.ok).toBe(true);
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(2);
    expect(h.api.callsTo("/auth/access_token/get")).toHaveLength(1);
  });

  /**
   * Cinco jobs percebendo o token vencido ao mesmo tempo não podem disparar
   * cinco renovações: a Shopee invalida o refresh token usado, e as quatro
   * renovações perdedoras derrubariam a conexão inteira.
   */
  it("renovações simultâneas viram uma só chamada", async () => {
    await h.integrations.update("shopee", {
      config: { tokenExpiresAt: Date.now() - 60_000 },
    });
    h.api.on("/auth/access_token/get", () => ({
      access_token: "token-unico",
      refresh_token: "refresh-unico",
      expire_in: 14_400,
    }));

    await Promise.all([h.auth.refresh(), h.auth.refresh(), h.auth.refresh()]);

    expect(h.api.callsTo("/auth/access_token/get")).toHaveLength(1);
  });

  it("sem refresh token gravado, pede nova autorização em vez de falhar calado", async () => {
    await h.integrations.update("shopee", {
      config: { tokenExpiresAt: Date.now() - 60_000 },
      removeSecrets: ["refreshToken"],
    });

    await expect(h.auth.shopAuth()).rejects.toThrow(/autorizada de novo/i);
  });

  it("desconectar apaga os tokens e preserva as associações", async () => {
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "802" });

    const view = await h.auth.disconnect();

    expect(view.connected).toBe(false);
    expect(view.enabled).toBe(false);
    expect(view.hasRefreshToken).toBe(false);
    // A associação sobrevive: reconectar não pode custar reassociar tudo.
    expect(await h.links.findBySku(SHOP_ID, productId, "")).not.toBeNull();
  });

  // ── 13/14/15. Rate limit, timeout, falha temporária ──────────────────

  it("limite de taxa devolve a mensagem à fila com espera crescente", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    h.api.failNext("/product/update_stock", shopeeErrors.rateLimit());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "803" });
    await h.stock.enqueueSync({ productId, variantId: "" });

    await h.sync.tick();

    const [message] = await h.outbox.list({ topic: STOCK_SYNC_TOPIC });
    expect(message.status).toBe("pending");
    expect(message.attempts).toBe(1);
    expect(message.lastError).toMatch(/Limite de requisições/);
    expect(message.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(h.sync.getMetrics().rateLimited).toBeGreaterThanOrEqual(1);
  });

  /** O limite é da LOJA: insistir nas outras mensagens só prolonga o bloqueio. */
  it("limite de taxa interrompe a volta inteira, não só a mensagem", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    h.api.failNext("/product/update_stock", shopeeErrors.rateLimit());
    const a = await h.seedLinkedProduct({ stock: 5, itemId: "804" });
    const b = await h.seedLinkedProduct({ stock: 5, itemId: "805" });
    await h.stock.enqueueSync({ productId: a.productId, variantId: "" });
    await h.stock.enqueueSync({ productId: b.productId, variantId: "" });

    await h.sync.tick();

    expect(h.api.callsTo("/product/update_stock")).toHaveLength(1);
    const pending = await h.outbox.list({ topic: STOCK_SYNC_TOPIC, status: "pending" });
    expect(pending).toHaveLength(2);
  });

  it("timeout não corrompe o estoque local: só sobra a mensagem na fila", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    h.api.failNext("/product/update_stock", shopeeErrors.timeout());
    const { productId } = await h.seedLinkedProduct({ stock: 10, itemId: "806" });
    const sku = { productId, variantId: "" };

    await h.inventory.reserve(
      { ...sku, quantity: 3, key: "SITE:C3D-T:x" },
      { channel: "SITE" },
    );
    await h.inventory.confirmSale("SITE:C3D-T:x", { channel: "SITE" });
    const before = await h.inventory.getStock(sku);

    await h.stock.enqueueSync(sku);
    await h.sync.tick();

    // O saldo local não se mexeu por causa da falha remota.
    expect(await h.inventory.getStock(sku)).toMatchObject({
      onHand: before.onHand,
      reserved: before.reserved,
      available: before.available,
    });
    const audit = await h.inventory.auditSku(sku);
    expect(audit.ok).toBe(true);
    expect((await h.outbox.list({ topic: STOCK_SYNC_TOPIC }))[0].status).toBe("pending");
  });

  /** Caso 15: falha temporária seguida de sucesso, sem intervenção. */
  it("falha temporária é superada na tentativa seguinte", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    h.api.failNext("/product/update_stock", shopeeErrors.serverError());
    const { productId } = await h.seedLinkedProduct({ stock: 7, itemId: "807" });
    await h.stock.enqueueSync({ productId, variantId: "" });

    await h.sync.tick();
    expect((await h.outbox.list({ topic: STOCK_SYNC_TOPIC }))[0].status).toBe("pending");

    // O backoff já passou; a segunda volta pega a mesma mensagem.
    await forceDue(h);
    await h.sync.tick();

    const [message] = await h.outbox.list({ topic: STOCK_SYNC_TOPIC });
    expect(message.status).toBe("done");
    expect(message.attempts).toBe(2);
    const link = await h.links.findBySku(SHOP_ID, productId, "");
    expect(link).toMatchObject({ status: "active", lastPushedStock: 7, failureCount: 0 });
  });

  it("a espera entre tentativas cresce e tem teto", () => {
    expect(backoffFor(1)).toBe(2_000);
    expect(backoffFor(2)).toBe(8_000);
    expect(backoffFor(3)).toBe(32_000);
    expect(backoffFor(10)).toBe(15 * 60_000);
  });

  // ── 16. Fila de mensagens mortas ─────────────────────────────────────

  it("mensagem que esgota as tentativas vai para a fila de mortas, não some", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "808" });
    const sku = { productId, variantId: "" };
    await h.stock.enqueueSync(sku);

    // Cinco falhas: o `maxAttempts` padrão.
    for (let i = 0; i < 5; i += 1) {
      h.api.failNext("/product/update_stock", shopeeErrors.serverError());
      await forceDue(h);
      await h.sync.tick();
    }

    const [dead] = await h.outbox.list({ topic: STOCK_SYNC_TOPIC });
    expect(dead.status).toBe("dead");
    expect(dead.attempts).toBe(5);
    expect(dead.lastError).toBeTruthy();
    expect(h.sync.getMetrics().dead).toBeGreaterThanOrEqual(1);

    // A associação está marcada em erro, mas o estoque local segue íntegro.
    const link = await h.links.findBySku(SHOP_ID, productId, "");
    expect(link?.status).toBe("error");
    expect(link?.failureCount).toBe(5);
    expect((await h.inventory.auditSku(sku)).ok).toBe(true);

    // E o reprocessamento manual do painel a traz de volta.
    expect(await h.outbox.retryAllDead(STOCK_SYNC_TOPIC)).toBe(1);
    await h.sync.tick();
    expect((await h.outbox.list({ topic: STOCK_SYNC_TOPIC }))[0].status).toBe("done");
  });

  it("erro permanente da Shopee não marca a associação como sincronizada", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    h.api.failNext("/product/update_stock", shopeeErrors.permanent());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "809" });

    await expect(
      h.stock.syncOne({ shopId: SHOP_ID, productId, variantId: "", correlationId: "c" }),
    ).rejects.toThrow(/item_id inexistente/);

    const link = await h.links.findBySku(SHOP_ID, productId, "");
    expect(link?.status).toBe("error");
    expect(link?.lastPushedStock).toBeUndefined();
  });

  /**
   * A v2 responde HTTP 200 com `failure_list` preenchida. Tratar isso como
   * sucesso marcaria como sincronizado um anúncio que a Shopee recusou — a
   * divergência mais difícil de achar depois, porque tudo parece verde.
   */
  it("sucesso parcial com failure_list é tratado como falha", async () => {
    h.api.on("/product/update_stock", () => ({
      failure_list: [{ model_id: 0, failed_reason: "item is deleted" }],
      success_list: [],
    }));
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "810" });

    await expect(
      h.stock.syncOne({ shopId: SHOP_ID, productId, variantId: "", correlationId: "c" }),
    ).rejects.toThrow(/item is deleted/);

    expect((await h.links.findBySku(SHOP_ID, productId, ""))?.status).toBe("error");
  });

  // ── 17. Conciliação ──────────────────────────────────────────────────

  it("a conciliação encontra a divergência e corrige com o saldo central", async () => {
    const { productId } = await h.seedLinkedProduct({ stock: 9, itemId: "900" });
    // A Shopee acha que tem 2; o sistema sabe que são 9.
    h.api.on("/product/get_item_base_info", () => ({
      item_list: [{ item_id: 900, stock_info_v2: { summary_info: { total_available_stock: 2 } } }],
    }));
    h.api.on("/product/update_stock", () => updateStockOk());

    const report = await h.reconciliation.run();

    expect(report.checked).toBe(1);
    expect(report.divergences).toHaveLength(1);
    expect(report.divergences[0]).toMatchObject({
      itemId: "900",
      expected: 9,
      remote: 2,
      corrected: true,
    });
    expect(report.corrected).toBe(1);
    expect(h.api.callsTo("/product/update_stock")[0].options.body).toMatchObject({
      stock_list: [{ seller_stock: [{ stock: 9 }] }],
    });
    expect((await h.links.findBySku(SHOP_ID, productId, ""))?.lastRemoteStock).toBe(2);
  });

  /** O enunciado proíbe sobrescrever em silêncio: dá para ver antes. */
  it("dryRun lista a divergência sem escrever nada na Shopee", async () => {
    await h.seedLinkedProduct({ stock: 9, itemId: "901" });
    h.api.on("/product/get_item_base_info", () => ({
      item_list: [{ item_id: 901, stock_info_v2: { summary_info: { total_available_stock: 2 } } }],
    }));

    const report = await h.reconciliation.run({ dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.divergences[0]).toMatchObject({ expected: 9, remote: 2, corrected: false });
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(0);
  });

  it("conciliação sem divergência não chama update_stock", async () => {
    await h.seedLinkedProduct({ stock: 4, itemId: "902" });
    h.api.on("/product/get_item_base_info", () => ({
      item_list: [{ item_id: 902, stock_info_v2: { summary_info: { total_available_stock: 4 } } }],
    }));

    const report = await h.reconciliation.run();

    expect(report.divergences).toHaveLength(0);
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(0);
    // Ciclo limpo carimba a última sincronização saudável.
    expect((await h.auth.connection()).lastHealthySyncAt).not.toBeNull();
  });

  it("falha ao ler um anúncio é registrada sem interromper os outros", async () => {
    await h.seedLinkedProduct({ stock: 4, itemId: "903" });
    await h.seedLinkedProduct({ stock: 6, itemId: "904" });
    h.api.on("/product/get_item_base_info", (options) => {
      if (options.query?.item_id_list === "903") throw shopeeErrors.timeout();
      return {
        item_list: [{ item_id: 904, stock_info_v2: { summary_info: { total_available_stock: 1 } } }],
      };
    });
    h.api.on("/product/update_stock", () => updateStockOk());

    const report = await h.reconciliation.run();

    expect(report.checked).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.corrected).toBe(1);
    expect(report.divergences.find((d) => d.itemId === "903")?.error).toMatch(/alcançar a Shopee/);
  });

  it("a conciliação usa a variação certa via get_model_list", async () => {
    await h.seedLinkedProduct({
      variants: [{ id: "var-a", stock: 3 }],
      itemId: "905",
      modelId: "42",
      variantId: "var-a",
    });
    h.api.on("/product/get_model_list", () => ({
      model: [
        { model_id: 42, stock_info_v2: { seller_stock: [{ location_id: "BR", stock: 1 }] } },
        { model_id: 43, stock_info_v2: { seller_stock: [{ stock: 99 }] } },
      ],
    }));
    h.api.on("/product/update_stock", () => updateStockOk());

    const report = await h.reconciliation.run();

    expect(report.divergences[0]).toMatchObject({ modelId: "42", expected: 3, remote: 1 });
  });

  // ── 20. Falha da Shopee sem corromper o estoque local ────────────────

  it("Shopee totalmente fora do ar: a venda local acontece e fica íntegra", async () => {
    const { productId } = await h.seedLinkedProduct({ stock: 6, itemId: "910" });
    const sku = { productId, variantId: "" };
    // Nenhum handler registrado: toda chamada estoura.
    h.api.on("/product/update_stock", () => {
      throw shopeeErrors.serverError();
    });

    await h.inventory.reserve({ ...sku, quantity: 2, key: "SITE:C3D-Z:x" }, { channel: "SITE" });
    const sale = await h.inventory.confirmSale("SITE:C3D-Z:x", { channel: "SITE" });
    await h.stock.enqueueSync(sku);
    await h.sync.tick();

    expect(sale.ok).toBe(true);
    const view = await h.inventory.getStock(sku);
    expect(view.onHand).toBe(4);
    expect(view.available).toBe(4);
    expect((await h.inventory.auditSku(sku)).ok).toBe(true);
    // O ledger registrou a venda; a Shopee é que ficou para trás.
    expect((await h.inventory.listLedger(sku, 20)).filter((e) => e.type === "sale")).toHaveLength(1);
    expect((await h.outbox.list({ topic: STOCK_SYNC_TOPIC }))[0].status).toBe("pending");
  });

  it("uma falha de sincronização não desfaz nem altera a reserva de outro canal", async () => {
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "911" });
    const sku = { productId, variantId: "" };
    h.api.on("/product/update_stock", () => {
      throw shopeeErrors.timeout();
    });

    await h.inventory.reserve({ ...sku, quantity: 2, key: "SHOPEE:x:1:s" }, { channel: "SHOPEE" });
    await h.stock.enqueueSync(sku);
    await h.sync.tick();

    expect(await h.inventory.getStock(sku)).toMatchObject({
      onHand: 5,
      reserved: 2,
      available: 3,
    });
  });

  // ── Métricas ─────────────────────────────────────────────────────────

  it("as métricas contam processadas, sucessos, falhas e mortas", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const ok = await h.seedLinkedProduct({ stock: 5, itemId: "920" });
    await h.stock.enqueueSync({ productId: ok.productId, variantId: "" });
    await h.sync.tick();

    const metrics = h.sync.getMetrics();
    expect(metrics.processed).toBeGreaterThanOrEqual(1);
    expect(metrics.succeeded).toBeGreaterThanOrEqual(1);
    expect(metrics.lastRunAt).not.toBeNull();
    expect(metrics.lastRunDurationMs).not.toBeNull();

    const stats = await h.outbox.stats("shopee.");
    expect(stats.done).toBeGreaterThanOrEqual(1);
  });
});

/**
 * Adianta o relógio da fila em vez de esperar o backoff de verdade.
 *
 * Um `setTimeout` real de 2 segundos por tentativa somaria dezenas de
 * segundos à suíte, e testar o RELÓGIO não é o objetivo — `backoffFor` já é
 * testado sozinho. Aqui interessa o comportamento depois da espera.
 */
async function forceDue(h: ShopeeHarness): Promise<void> {
  await h.connection
    .collection("outbox_messages")
    .updateMany({ status: "pending" }, { $set: { nextAttemptAt: new Date(Date.now() - 1000) } });
}
