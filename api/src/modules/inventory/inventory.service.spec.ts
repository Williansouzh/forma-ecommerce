import { Test, TestingModule } from "@nestjs/testing";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { InventoryModule } from "./inventory.module";
import { InventoryService, type Sku } from "./inventory.service";
import { StockLedgerEntry } from "./schemas/stock-ledger.schema";
import { Product, ProductDocument } from "../products/schemas/product.schema";
import {
  clearCollections,
  ensureIndexes,
  testMongoModule,
} from "../../test/mongo";

const CONTEXT = { channel: "SITE" as const, correlationId: "test-corr" };

describe("InventoryService (integração com Mongo)", () => {
  let app: TestingModule;
  let inventory: InventoryService;
  let productModel: Model<ProductDocument>;
  let ledgerModel: Model<StockLedgerEntry>;
  let connection: Connection;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [testMongoModule("forma_test_inventory"), InventoryModule],
    }).compile();
    inventory = app.get(InventoryService);
    productModel = app.get(getModelToken(Product.name));
    ledgerModel = app.get(getModelToken(StockLedgerEntry.name));
    connection = app.get(getConnectionToken());
    await ensureIndexes(connection);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => clearCollections(connection));

  /** Um produto de verdade: o serviço lê `stock` dele para se inicializar. */
  async function makeProduct(
    stock: number | undefined,
    variants: { id: string; stock: number }[] = [],
  ): Promise<string> {
    const created = await productModel.create({
      name: "Cactos de Mesa",
      slug: `cactos-${Math.random().toString(36).slice(2)}`,
      description: "d",
      shortDescription: "s",
      price: 9900,
      category: "decoracao",
      images: [{ url: "/a.jpg", alt: "a" }],
      variants: variants.map((v) => ({ ...v, name: v.id, priceAdjustment: 0 })),
      ...(stock === undefined ? {} : { stock }),
      isAvailable: true,
    });
    return String(created._id);
  }

  // ── Saldo de abertura ────────────────────────────────────────────────

  it("adota o estoque do cadastro como saldo de abertura, uma única vez", async () => {
    const productId = await makeProduct(14);
    const sku: Sku = { productId, variantId: "" };

    await inventory.ensureTracked(sku);
    await inventory.ensureTracked(sku);

    const view = await inventory.getStock(sku);
    expect(view.onHand).toBe(14);
    expect(view.available).toBe(14);

    const entries = await ledgerModel.find({ ...sku, type: "entry" }).lean();
    expect(entries).toHaveLength(1);
    expect(entries[0].channel).toBe("SYSTEM");
  });

  // ── Reserva ──────────────────────────────────────────────────────────

  it("reserva sem tirar do físico e derruba o disponível", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };

    const result = await inventory.reserve({ ...sku, quantity: 2, key: "SITE:C3D-1:s" }, CONTEXT);

    expect(result).toMatchObject({ ok: true, reason: "reserved", available: 3 });
    const view = await inventory.getStock(sku);
    expect(view.onHand).toBe(5);
    expect(view.reserved).toBe(2);
    expect(view.available).toBe(3);
  });

  it("recusa reservar mais do que há, sem deixar saldo negativo", async () => {
    const productId = await makeProduct(1);
    const sku: Sku = { productId, variantId: "" };

    const result = await inventory.reserve({ ...sku, quantity: 2, key: "SITE:C3D-2:s" }, CONTEXT);

    expect(result).toMatchObject({ ok: false, reason: "insufficient" });
    const view = await inventory.getStock(sku);
    expect(view.reserved).toBe(0);
    expect(view.available).toBe(1);
  });

  /** Caso 5 do enunciado, na camada de estoque. */
  it("a mesma chave de reserva não compromete estoque duas vezes", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };

    const first = await inventory.reserve({ ...sku, quantity: 2, key: "SHOPEE:1:AB:s" }, CONTEXT);
    const second = await inventory.reserve({ ...sku, quantity: 2, key: "SHOPEE:1:AB:s" }, CONTEXT);

    expect(first.reason).toBe("reserved");
    expect(second.reason).toBe("already");
    expect((await inventory.getStock(sku)).reserved).toBe(2);
  });

  /**
   * Caso 7: o site e a Shopee vendendo a ÚLTIMA peça no mesmo instante.
   *
   * As duas reservas partem juntas, sem `await` entre elas — é a condição de
   * corrida real, não uma simulação sequencial. A guarda é o
   * `findOneAndUpdate` condicional: o Mongo aplica uma e a outra volta sem
   * documento.
   */
  it("duas vendas simultâneas pela última unidade: exatamente uma ganha", async () => {
    const productId = await makeProduct(1);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);

    const [site, shopee] = await Promise.all([
      inventory.reserve({ ...sku, quantity: 1, key: "SITE:C3D-9:s" }, { channel: "SITE" }),
      inventory.reserve({ ...sku, quantity: 1, key: "SHOPEE:1:XY:s" }, { channel: "SHOPEE" }),
    ]);

    const winners = [site, shopee].filter((r) => r.reason === "reserved");
    const losers = [site, shopee].filter((r) => r.reason === "insufficient");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);

    const view = await inventory.getStock(sku);
    expect(view.reserved).toBe(1);
    expect(view.available).toBe(0);
    expect(view.onHand).toBeGreaterThanOrEqual(0);
  });

  it("dez reservas concorrentes sobre três peças param em três", async () => {
    const productId = await makeProduct(3);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        inventory.reserve({ ...sku, quantity: 1, key: `SITE:C3D-${i}:s` }, CONTEXT),
      ),
    );

    expect(results.filter((r) => r.reason === "reserved")).toHaveLength(3);
    expect((await inventory.getStock(sku)).available).toBe(0);
  });

  // ── Confirmação e FEFO ───────────────────────────────────────────────

  /** Caso 3: a confirmação consome o lote que vence primeiro. */
  it("a venda confirmada consome o lote FEFO e congela o COGS do lote", async () => {
    const productId = await makeProduct(0);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);

    await inventory.receive(
      sku,
      { quantity: 5, unitCost: 900, code: "SEM-VALIDADE" },
      { channel: "ADMIN" },
    );
    await inventory.receive(
      sku,
      { quantity: 2, unitCost: 500, code: "VENCE-ANTES", expiresAt: new Date(Date.now() + 86_400_000) },
      { channel: "ADMIN" },
    );

    await inventory.reserve({ ...sku, quantity: 3, key: "SITE:C3D-7:s" }, CONTEXT);
    const confirmed = await inventory.confirmSale("SITE:C3D-7:s", { channel: "SITE" });

    expect(confirmed.ok).toBe(true);
    // 2 do lote que vence (500) + 1 do eterno (900).
    expect(confirmed.cogs).toBe(2 * 500 + 900);
    expect(confirmed.batches).toHaveLength(2);

    const view = await inventory.getStock(sku);
    expect(view.onHand).toBe(4);
    expect(view.reserved).toBe(0);
    expect(view.available).toBe(4);
  });

  /** Caso 5, na transição que importa: confirmar duas vezes não baixa duas. */
  it("confirmar a mesma reserva duas vezes baixa o estoque uma vez só", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 2, key: "SHOPEE:1:DUP:s" }, CONTEXT);

    const first = await inventory.confirmSale("SHOPEE:1:DUP:s", { channel: "SHOPEE" });
    const second = await inventory.confirmSale("SHOPEE:1:DUP:s", { channel: "SHOPEE" });

    expect(first.reason).toBe("confirmed");
    expect(second.reason).toBe("already");
    expect(second.cogs).toBe(0);
    expect((await inventory.getStock(sku)).onHand).toBe(3);
  });

  it("confirmações simultâneas da mesma reserva baixam uma vez só", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 2, key: "SHOPEE:1:RACE:s" }, CONTEXT);

    const results = await Promise.all([
      inventory.confirmSale("SHOPEE:1:RACE:s", { channel: "SHOPEE" }),
      inventory.confirmSale("SHOPEE:1:RACE:s", { channel: "SHOPEE" }),
    ]);

    expect(results.filter((r) => r.reason === "confirmed")).toHaveLength(1);
    expect((await inventory.getStock(sku)).onHand).toBe(3);
  });

  // ── Cancelamento e devolução ─────────────────────────────────────────

  /** Caso 4: cancelar antes de confirmar devolve o disponível. */
  it("liberar a reserva devolve o disponível sem mexer no físico", async () => {
    const productId = await makeProduct(4);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 3, key: "SHOPEE:1:CANC:s" }, CONTEXT);

    const released = await inventory.release("SHOPEE:1:CANC:s", { channel: "SHOPEE" });

    expect(released).toBe(true);
    const view = await inventory.getStock(sku);
    expect(view.onHand).toBe(4);
    expect(view.reserved).toBe(0);
    expect(view.available).toBe(4);
    expect(await inventory.release("SHOPEE:1:CANC:s", { channel: "SHOPEE" })).toBe(false);
  });

  it("liberar não desfaz uma venda já confirmada", async () => {
    const productId = await makeProduct(4);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 1, key: "SITE:C3D-5:s" }, CONTEXT);
    await inventory.confirmSale("SITE:C3D-5:s", { channel: "SITE" });

    expect(await inventory.release("SITE:C3D-5:s", { channel: "SITE" })).toBe(false);
    expect((await inventory.getStock(sku)).onHand).toBe(3);
  });

  it("a devolução recria estoque e o ledger guarda os dois fatos", async () => {
    const productId = await makeProduct(4);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 1, key: "SHOPEE:1:DEV:s" }, CONTEXT);
    await inventory.confirmSale("SHOPEE:1:DEV:s", { channel: "SHOPEE" });

    const returned = await inventory.returnToStock("SHOPEE:1:DEV:s", { channel: "SHOPEE" });

    expect(returned).toBe(true);
    expect((await inventory.getStock(sku)).onHand).toBe(4);
    const types = (await ledgerModel.find(sku).sort({ createdAt: 1 }).lean()).map((e) => e.type);
    expect(types).toEqual(["entry", "reserve", "sale", "return"]);
  });

  // ── Vencimento e perdas ──────────────────────────────────────────────

  /** Caso 19: peça vencida existe fisicamente e não entra no disponível. */
  it("lote vencido sai do disponível e não pode ser reservado", async () => {
    const productId = await makeProduct(0);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);
    await inventory.receive(
      sku,
      { quantity: 6, unitCost: 100, expiresAt: new Date(Date.now() - 86_400_000) },
      { channel: "ADMIN" },
    );

    const result = await inventory.reserve({ ...sku, quantity: 1, key: "SITE:C3D-V:s" }, CONTEXT);

    expect(result.reason).toBe("insufficient");
    const view = await inventory.getStock(sku);
    expect(view.available).toBe(0);
    expect(view.onHand).toBe(0);
    const expiry = await ledgerModel.find({ ...sku, type: "expiry" }).lean();
    expect(expiry[0].quantity).toBe(-6);
  });

  it("a perda exige motivo e sai pelo lote FEFO", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);

    await expect(
      inventory.registerLoss(sku, 2, { channel: "ADMIN", reason: "" }),
    ).rejects.toThrow(/motivo/i);

    const view = await inventory.registerLoss(sku, 2, {
      channel: "ADMIN",
      reason: "Peça quebrada no acabamento",
      actor: "admin@forma.estudio",
    });
    expect(view.onHand).toBe(3);
  });

  /**
   * A invariante que o físico não pode violar: prometemos três peças, temos
   * três. Dar baixa de uma quebrada que já estava reservada deixaria
   * `onHand < reserved` — o disponível continuaria dizendo zero como se
   * estivesse tudo bem, e o pedido seria despachado incompleto.
   */
  it("recusa perda que deixaria menos peças do que o já reservado", async () => {
    const productId = await makeProduct(3);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 3, key: "SITE:C3D-R:s" }, CONTEXT);

    await expect(
      inventory.registerLoss(sku, 1, { channel: "ADMIN", reason: "Peça quebrada" }),
    ).rejects.toThrow(/já está reservado/);

    const view = await inventory.getStock(sku);
    expect(view.onHand).toBe(3);
    expect(view.reserved).toBe(3);
    // E o lote não ficou com a baixa pela metade.
    const [batch] = await inventory.listBatches(sku);
    expect(batch.lost).toBe(0);
  });

  it("permite perda até o limite do que não está reservado", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 3, key: "SITE:C3D-P:s" }, CONTEXT);

    const view = await inventory.registerLoss(sku, 2, {
      channel: "ADMIN",
      reason: "Refugo de impressão",
    });

    expect(view).toMatchObject({ onHand: 3, reserved: 3, available: 0 });
  });

  it("o ajuste negativo não passa do que existe em lote", async () => {
    const productId = await makeProduct(2);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);

    await expect(
      inventory.adjust(sku, -5, { channel: "ADMIN", reason: "Inventário" }),
    ).rejects.toThrow(/faltam/);
    expect((await inventory.getStock(sku)).onHand).toBe(2);
  });

  // ── Variações e produto sob demanda ──────────────────────────────────

  /** Caso 9: cada variação tem saldo próprio, sem vazar para a irmã. */
  it("variações do mesmo produto têm saldos independentes", async () => {
    const productId = await makeProduct(undefined, [
      { id: "var-verde", stock: 4 },
      { id: "var-terracota", stock: 1 },
    ]);
    const verde: Sku = { productId, variantId: "var-verde" };
    const terracota: Sku = { productId, variantId: "var-terracota" };

    await inventory.reserve({ ...verde, quantity: 4, key: "SITE:C3D-A:v" }, CONTEXT);

    expect((await inventory.getStock(verde)).available).toBe(0);
    expect((await inventory.getStock(terracota)).available).toBe(1);

    const projected = await productModel.findById(productId).lean();
    expect(projected?.variants.find((v) => v.id === "var-verde")?.stock).toBe(0);
    expect(projected?.variants.find((v) => v.id === "var-terracota")?.stock).toBe(1);
  });

  /** Caso 8/10: peça sob encomenda não tem saldo, e não pode ser barrada. */
  it("produto sob demanda reserva sem saldo, sem virar estoque negativo", async () => {
    const productId = await makeProduct(undefined);
    const sku: Sku = { productId, variantId: "" };

    const result = await inventory.reserve({ ...sku, quantity: 3, key: "SITE:C3D-D:s" }, CONTEXT);

    expect(result).toMatchObject({ ok: true, reason: "untracked" });
    const confirmed = await inventory.confirmSale("SITE:C3D-D:s", { channel: "SITE" });
    expect(confirmed.reason).toBe("untracked");
  });

  // ── Ledger e projeção ────────────────────────────────────────────────

  it("o ledger recusa reescrita de uma linha já gravada", async () => {
    const productId = await makeProduct(3);
    const sku: Sku = { productId, variantId: "" };
    await inventory.ensureTracked(sku);

    const entry = await ledgerModel.findOne(sku);
    entry!.quantity = 999;
    await expect(entry!.save()).rejects.toThrow(/imutável/);
    await expect(
      ledgerModel.updateOne({ _id: entry!._id }, { $set: { quantity: 999 } }).exec(),
    ).rejects.toThrow(/imutável/);
  });

  it("o contador de saldo bate com a soma do ledger depois do fluxo inteiro", async () => {
    const productId = await makeProduct(10);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 3, key: "k1" }, CONTEXT);
    await inventory.confirmSale("k1", { channel: "SITE" });
    await inventory.reserve({ ...sku, quantity: 2, key: "k2" }, CONTEXT);
    await inventory.release("k2", { channel: "SITE" });
    await inventory.registerLoss(sku, 1, { channel: "ADMIN", reason: "Refugo" });

    const audit = await inventory.auditSku(sku);
    expect(audit).toMatchObject({ counter: 6, ledger: 6, ok: true });
  });

  it("projeta o disponível de volta em product.stock", async () => {
    const productId = await makeProduct(8);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 3, key: "k9" }, CONTEXT);

    expect((await productModel.findById(productId).lean())?.stock).toBe(5);
  });

  it("devolve reservas vencidas na varredura", async () => {
    const productId = await makeProduct(5);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve(
      { ...sku, quantity: 2, key: "abandonado", expiresAt: new Date(Date.now() - 1000) },
      CONTEXT,
    );

    expect(await inventory.releaseExpiredReservations()).toBe(1);
    expect((await inventory.getStock(sku)).available).toBe(5);
  });

  // ── Margem de segurança ──────────────────────────────────────────────

  /** Caso 18, atravessando o serviço e não só a função pura. */
  it("o estoque publicável desconta a margem de segurança do disponível", async () => {
    const productId = await makeProduct(10);
    const sku: Sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 2, key: "kmargem" }, CONTEXT);

    expect(await inventory.getPublishableStock(sku, 0)).toBe(8);
    expect(await inventory.getPublishableStock(sku, 3)).toBe(5);
    expect(await inventory.getPublishableStock(sku, 50)).toBe(0);
  });
});
