import {
  createShopeeHarness,
  updateStockOk,
  SHOP_ID,
  type ShopeeHarness,
} from "../../test/shopee-harness";
import { STOCK_SYNC_TOPIC } from "./shopee-inventory.service";
import { ORDER_SYNC_TOPIC } from "./shopee-order.service";

/** Um pedido da Shopee com um item, do jeito que `get_order_detail` devolve. */
function orderDetail(input: {
  orderSn: string;
  status: string;
  itemId: string;
  modelId?: string;
  quantity?: number;
  price?: number;
}) {
  return {
    order_list: [
      {
        order_sn: input.orderSn,
        order_status: input.status,
        total_amount: (input.price ?? 99) * (input.quantity ?? 1),
        recipient_address: {
          name: "Maria Souza",
          phone: "+5583988887777",
          full_address: "Rua das Palmeiras, 120",
          city: "Campina Grande",
          state: "PB",
          zipcode: "58400000",
          district: "Centro",
        },
        item_list: [
          {
            item_id: Number(input.itemId),
            model_id: Number(input.modelId ?? 0),
            item_name: "Cactos de Mesa",
            model_quantity_purchased: input.quantity ?? 1,
            model_discounted_price: input.price ?? 99,
          },
        ],
      },
    ],
  };
}

describe("Integração Shopee (Mongo real, só a API da Shopee é dublê)", () => {
  let h: ShopeeHarness;

  beforeAll(async () => {
    h = await createShopeeHarness("forma_test_shopee");
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(() => h.reset());

  // ── 1. Venda no site atualiza a Shopee ───────────────────────────────

  it("venda no site enfileira e envia o novo saldo para a Shopee", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 10, itemId: "555" });

    // A venda: reserva e confirma, como o pedido do site faz.
    await h.inventory.reserve(
      { productId, variantId: "", quantity: 3, key: "SITE:C3D-1:x" },
      { channel: "SITE" },
    );
    await h.inventory.confirmSale("SITE:C3D-1:x", { channel: "SITE" });
    await h.stock.enqueueSync({ productId, variantId: "" });

    // A venda NÃO chamou a Shopee: só deixou a mensagem na fila.
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(0);
    const queued = await h.outbox.list({ topic: STOCK_SYNC_TOPIC });
    expect(queued).toHaveLength(1);

    await h.sync.tick();

    const [call] = h.api.callsTo("/product/update_stock");
    expect(call.options.body).toMatchObject({
      item_id: 555,
      stock_list: [{ model_id: 0, seller_stock: [{ stock: 7 }] }],
    });
    expect((await h.outbox.list({ topic: STOCK_SYNC_TOPIC }))[0].status).toBe("done");
  });

  /** Caso 18 atravessando a integração inteira, até o corpo da chamada. */
  it("a margem de segurança é descontada do que vai para a Shopee", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({
      stock: 10,
      itemId: "556",
      safetyMargin: 4,
    });

    await h.stock.syncOne({ shopId: SHOP_ID, productId, variantId: "", correlationId: "c" });

    expect(h.api.callsTo("/product/update_stock")[0].options.body).toMatchObject({
      stock_list: [{ seller_stock: [{ stock: 6 }] }],
    });
  });

  it("não repete a chamada quando o saldo já está sincronizado", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "557" });
    const payload = { shopId: SHOP_ID, productId, variantId: "", correlationId: "c" };

    await h.stock.syncOne(payload);
    const second = await h.stock.syncOne(payload);

    expect(second.reason).toBe("saldo já sincronizado");
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(1);
  });

  // ── 2. Pedido da Shopee reserva estoque ──────────────────────────────

  it("pedido novo da Shopee reserva sem baixar o físico", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 8, itemId: "600" });
    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101AAA", status: "UNPAID", itemId: "600", quantity: 2 }),
    );

    const result = await h.orders.process({
      shopId: SHOP_ID,
      orderSn: "250101AAA",
      correlationId: "c1",
    });

    expect(result.handled).toBe(true);
    const view = await h.inventory.getStock({ productId, variantId: "" });
    expect(view.onHand).toBe(8);
    expect(view.reserved).toBe(2);
    expect(view.available).toBe(6);

    const order = await h.orderModel.findOne({ "externalRef.orderSn": "250101AAA" }).lean();
    expect(order).toMatchObject({ channel: "shopee", status: "pending" });
    expect(order?.code).toMatch(/^SHP-\d+$/);
  });

  it("READY_TO_SHIP confirma a venda e consome o lote FEFO", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 0, itemId: "601" });
    const sku = { productId, variantId: "" };

    await h.inventory.receive(sku, { quantity: 4, unitCost: 800 }, { channel: "ADMIN" });
    await h.inventory.receive(
      sku,
      { quantity: 2, unitCost: 300, expiresAt: new Date(Date.now() + 86_400_000) },
      { channel: "ADMIN" },
    );

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101BBB", status: "READY_TO_SHIP", itemId: "601", quantity: 2 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101BBB", correlationId: "c2" });

    const view = await h.inventory.getStock(sku);
    expect(view.onHand).toBe(4);
    expect(view.reserved).toBe(0);

    // O lote que vence primeiro foi o consumido — 2 unidades a 300.
    const sales = await h.inventory.listLedger(sku, 20);
    const sale = sales.find((entry) => entry.type === "sale");
    expect(sale?.cogs).toBe(600);
    expect(sale?.channel).toBe("SHOPEE");
    expect(sale?.externalOrderSn).toBe("250101BBB");
  });

  it("o pedido inteiro percorre UNPAID → READY_TO_SHIP → SHIPPED baixando uma vez só", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 6, itemId: "602" });
    const sku = { productId, variantId: "" };

    for (const status of ["UNPAID", "READY_TO_SHIP", "PROCESSED", "SHIPPED", "COMPLETED"]) {
      h.api.on("/order/get_order_detail", () =>
        orderDetail({ orderSn: "250101CCC", status, itemId: "602", quantity: 2 }),
      );
      await h.orders.process({ shopId: SHOP_ID, orderSn: "250101CCC", correlationId: `c-${status}` });
    }

    const view = await h.inventory.getStock(sku);
    expect(view.onHand).toBe(4);
    expect(view.reserved).toBe(0);

    // Uma linha de venda. Só uma.
    const ledger = await h.inventory.listLedger(sku, 50);
    expect(ledger.filter((e) => e.type === "sale")).toHaveLength(1);
    // E um pedido interno só, apesar dos cinco eventos.
    expect(await h.orderModel.countDocuments({ "externalRef.orderSn": "250101CCC" })).toBe(1);
  });

  // ── 5. Evento duplicado ──────────────────────────────────────────────

  it("o mesmo evento processado duas vezes não baixa duas vezes", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "603" });
    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101DDD", status: "READY_TO_SHIP", itemId: "603", quantity: 2 }),
    );
    const payload = { shopId: SHOP_ID, orderSn: "250101DDD", correlationId: "c3" };

    const first = await h.orders.process(payload);
    const second = await h.orders.process(payload);

    expect(first.handled).toBe(true);
    expect(second.handled).toBe(false);
    expect(second.reason).toMatch(/já processado/);
    expect((await h.inventory.getStock({ productId, variantId: "" })).onHand).toBe(3);
  });

  it("dois workers processando o mesmo push simultaneamente baixam uma vez", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "604" });
    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101EEE", status: "READY_TO_SHIP", itemId: "604", quantity: 2 }),
    );
    const payload = { shopId: SHOP_ID, orderSn: "250101EEE", correlationId: "c4" };

    const results = await Promise.all([h.orders.process(payload), h.orders.process(payload)]);

    expect(results.filter((r) => r.handled)).toHaveLength(1);
    expect((await h.inventory.getStock({ productId, variantId: "" })).onHand).toBe(3);
  });

  // ── 6. Eventos fora de ordem ─────────────────────────────────────────

  /**
   * Um pedido descoberto já enviado: o push de READY_TO_SHIP se perdeu. A
   * baixa tem de acontecer AGORA, senão o saldo fica inflado para sempre — e
   * a conciliação empurraria o número errado para a Shopee em vez de corrigi-lo.
   */
  it("pedido visto pela primeira vez já enviado baixa o estoque assim mesmo", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "620" });
    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101PERD", status: "SHIPPED", itemId: "620", quantity: 2 }),
    );

    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101PERD", correlationId: "c-perd" });

    const view = await h.inventory.getStock({ productId, variantId: "" });
    expect(view.onHand).toBe(3);
    expect(view.reserved).toBe(0);
  });

  it("evento atrasado é descartado sem regredir o pedido nem o estoque", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "605" });

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101FFF", status: "SHIPPED", itemId: "605", quantity: 1 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101FFF", correlationId: "c5" });

    // O push de READY_TO_SHIP chega DEPOIS do de SHIPPED.
    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101FFF", status: "READY_TO_SHIP", itemId: "605", quantity: 1 }),
    );
    const late = await h.orders.process({ shopId: SHOP_ID, orderSn: "250101FFF", correlationId: "c6" });

    expect(late.handled).toBe(false);
    expect(late.reason).toMatch(/atrasado/);
    const order = await h.orderModel.findOne({ "externalRef.orderSn": "250101FFF" }).lean();
    expect(order?.status).toBe("shipped");
    expect(order?.externalRef?.remoteStatus).toBe("SHIPPED");
    // E o mais importante: o evento atrasado não baixou o estoque de novo.
    const ledger = await h.inventory.listLedger({ productId, variantId: "" }, 20);
    expect(ledger.filter((e) => e.type === "sale")).toHaveLength(1);
    expect((await h.inventory.getStock({ productId, variantId: "" })).onHand).toBe(4);
  });

  /**
   * A exceção deliberada da régua: cancelamento não é "atrasado" nunca. Um
   * pedido enviado ainda pode ser cancelado, e ignorar isso prenderia o
   * estoque de vez.
   */
  it("cancelamento é aceito mesmo chegando depois de SHIPPED", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "606" });
    const sku = { productId, variantId: "" };

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101GGG", status: "SHIPPED", itemId: "606", quantity: 2 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101GGG", correlationId: "c7" });

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101GGG", status: "CANCELLED", itemId: "606", quantity: 2 }),
    );
    const cancelled = await h.orders.process({
      shopId: SHOP_ID,
      orderSn: "250101GGG",
      correlationId: "c8",
    });

    expect(cancelled.handled).toBe(true);
    expect((await h.inventory.getStock(sku)).available).toBe(5);
  });

  // ── 4. Cancelamento ──────────────────────────────────────────────────

  it("cancelar antes da baixa libera a reserva", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "607" });
    const sku = { productId, variantId: "" };

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101HHH", status: "UNPAID", itemId: "607", quantity: 3 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101HHH", correlationId: "c9" });
    expect((await h.inventory.getStock(sku)).available).toBe(2);

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101HHH", status: "CANCELLED", itemId: "607", quantity: 3 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101HHH", correlationId: "c10" });

    const view = await h.inventory.getStock(sku);
    expect(view.available).toBe(5);
    expect(view.onHand).toBe(5);
  });

  it("devolução após a baixa recria o estoque", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "608" });
    const sku = { productId, variantId: "" };

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101III", status: "READY_TO_SHIP", itemId: "608", quantity: 2 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101III", correlationId: "c11" });
    expect((await h.inventory.getStock(sku)).onHand).toBe(3);

    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101III", status: "TO_RETURN", itemId: "608", quantity: 2 }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101III", correlationId: "c12" });

    expect((await h.inventory.getStock(sku)).onHand).toBe(5);
    const ledger = await h.inventory.listLedger(sku, 20);
    expect(ledger.find((e) => e.type === "return")?.channel).toBe("SHOPEE");
  });

  // ── 9. Variações ─────────────────────────────────────────────────────

  it("cada variação sincroniza o próprio model_id com o próprio saldo", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({
      variants: [
        { id: "var-verde", stock: 4 },
        { id: "var-terracota", stock: 7 },
      ],
      itemId: "700",
      modelId: "111",
      variantId: "var-verde",
    });
    await h.links.upsert({
      shopId: SHOP_ID,
      productId,
      variantId: "var-terracota",
      itemId: "700",
      modelId: "222",
      status: "active",
    });

    h.api.on("/order/get_order_detail", () =>
      orderDetail({
        orderSn: "250101JJJ",
        status: "READY_TO_SHIP",
        itemId: "700",
        modelId: "111",
        quantity: 2,
      }),
    );
    await h.orders.process({ shopId: SHOP_ID, orderSn: "250101JJJ", correlationId: "c13" });
    await h.sync.tick();

    expect((await h.inventory.getStock({ productId, variantId: "var-verde" })).onHand).toBe(2);
    expect((await h.inventory.getStock({ productId, variantId: "var-terracota" })).onHand).toBe(7);

    const pushed = h.api.callsTo("/product/update_stock").map((c) => c.options.body);
    expect(pushed).toContainEqual({
      item_id: 700,
      stock_list: [{ model_id: 111, seller_stock: [{ stock: 2 }] }],
    });
    // A variação irmã não foi tocada: a venda de uma não mexe no saldo da outra.
    expect(pushed.some((b) => JSON.stringify(b).includes('"model_id":222'))).toBe(false);
  });

  it("recusa associar o produto pai quando ele tem variações", async () => {
    const created = await h.productModel.create({
      name: "Com variações",
      slug: `variacoes-${Math.random().toString(36).slice(2)}`,
      description: "d",
      shortDescription: "s",
      price: 100,
      category: "decoracao",
      images: [{ url: "/a.jpg", alt: "a" }],
      variants: [{ id: "v1", name: "V1", priceAdjustment: 0, stock: 1 }],
      isAvailable: true,
    });

    await expect(
      h.links.upsert({
        shopId: SHOP_ID,
        productId: String(created._id),
        itemId: "999",
        status: "active",
      }),
    ).rejects.toThrow(/associe cada variação/i);
  });

  // ── 10. Produto sem associação ───────────────────────────────────────

  it("pedido com item sem associação entra, é sinalizado e não mexe em estoque", async () => {
    h.api.on("/order/get_order_detail", () =>
      orderDetail({ orderSn: "250101KKK", status: "READY_TO_SHIP", itemId: "888", quantity: 1 }),
    );

    const result = await h.orders.process({
      shopId: SHOP_ID,
      orderSn: "250101KKK",
      correlationId: "c14",
    });

    expect(result.handled).toBe(true);
    expect(result.reason).toMatch(/sem associação/);
    const order = await h.orderModel.findOne({ "externalRef.orderSn": "250101KKK" }).lean();
    expect(order?.items[0].productId).toBe("shopee:888:0");
    // Nenhuma linha de ledger foi criada para um SKU que não existe aqui.
    expect(await h.inventory.listLedger({}, 50)).toHaveLength(0);
  });

  it("SKU sem associação não gera chamada de sincronização", async () => {
    const created = await h.productModel.create({
      name: "Solto",
      slug: `solto-${Math.random().toString(36).slice(2)}`,
      description: "d",
      shortDescription: "s",
      price: 100,
      category: "decoracao",
      images: [{ url: "/a.jpg", alt: "a" }],
      variants: [],
      stock: 5,
      isAvailable: true,
    });

    await h.stock.enqueueSync({ productId: String(created._id), variantId: "" });

    expect(await h.outbox.list({ topic: STOCK_SYNC_TOPIC })).toHaveLength(0);
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(0);
  });

  it("associação pendente de confirmação não sincroniza sozinha", async () => {
    h.api.on("/product/update_stock", () => updateStockOk());
    const { productId } = await h.seedLinkedProduct({ stock: 5, itemId: "889" });
    await h.links.upsert({
      shopId: SHOP_ID,
      productId,
      itemId: "889",
      status: "pending",
    });

    const result = await h.stock.syncOne({
      shopId: SHOP_ID,
      productId,
      variantId: "",
      correlationId: "c",
    });

    expect(result.reason).toMatch(/aguardando confirmação/);
    expect(h.api.callsTo("/product/update_stock")).toHaveLength(0);
  });

  // ── Fila e webhook ───────────────────────────────────────────────────

  it("o mesmo pedido em status diferentes gera mensagens distintas na fila", async () => {
    await h.orders.enqueue({
      shopId: SHOP_ID,
      orderSn: "250101LLL",
      hintedStatus: "UNPAID",
      correlationId: "c",
    });
    await h.orders.enqueue({
      shopId: SHOP_ID,
      orderSn: "250101LLL",
      hintedStatus: "READY_TO_SHIP",
      correlationId: "c",
    });
    // Este é repetido: mesma chave, uma mensagem só.
    await h.orders.enqueue({
      shopId: SHOP_ID,
      orderSn: "250101LLL",
      hintedStatus: "UNPAID",
      correlationId: "c",
    });

    expect(await h.outbox.list({ topic: ORDER_SYNC_TOPIC })).toHaveLength(2);
  });

  it("a varredura periódica encontra e enfileira pedidos recentes", async () => {
    h.api.on("/order/get_order_list", () => ({
      order_list: [
        { order_sn: "250101MMM", order_status: "READY_TO_SHIP" },
        { order_sn: "250101NNN", order_status: "UNPAID" },
      ],
      more: false,
    }));

    const result = await h.orders.pollRecentOrders(60, "c15");

    expect(result).toEqual({ found: 2, enqueued: 2 });
    expect(await h.outbox.list({ topic: ORDER_SYNC_TOPIC })).toHaveLength(2);
  });
});
