import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { configuration } from "../../config/configuration";
import { OrdersModule } from "./orders.module";
import { OrdersService } from "./orders.service";
import { InventoryService } from "../inventory/inventory.service";
import { OutboxService } from "../outbox/outbox.service";
import { IntegrationsService } from "../integrations/integrations.service";
import { ShopeeLinkService } from "../shopee/shopee-link.service";
import { ShopeeApiClient } from "../shopee/shopee-api.client";
import { STOCK_SYNC_TOPIC } from "../shopee/shopee-inventory.service";
import { Product, ProductDocument } from "../products/schemas/product.schema";
import { Order, OrderDocument } from "./schemas/order.schema";
import { FakeShopeeApi } from "../../test/fake-shopee-api";
import { clearCollections, ensureIndexes, testMongoModule } from "../../test/mongo";

const SHOP_ID = "98765";

/**
 * O ciclo do pedido da LOJA movendo o estoque.
 *
 * Antes desta integração, criar e pagar um pedido não tocava em estoque
 * nenhum — o campo `stock` só mudava quando alguém o editava no painel. Estes
 * casos são a prova de que o site virou a fonte do saldo, e não só um
 * consumidor dele.
 */
describe("OrdersService e o estoque", () => {
  let app: TestingModule;
  let orders: OrdersService;
  let inventory: InventoryService;
  let outbox: OutboxService;
  let links: ShopeeLinkService;
  let productModel: Model<ProductDocument>;
  let orderModel: Model<OrderDocument>;
  let connection: Connection;
  const api = new FakeShopeeApi();

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        testMongoModule("forma_test_orders"),
        OrdersModule,
      ],
    })
      .overrideProvider(ShopeeApiClient)
      .useValue(api)
      .compile();

    orders = app.get(OrdersService);
    inventory = app.get(InventoryService);
    outbox = app.get(OutboxService);
    links = app.get(ShopeeLinkService);
    productModel = app.get(getModelToken(Product.name));
    orderModel = app.get(getModelToken(Order.name));
    connection = app.get(getConnectionToken());
    await ensureIndexes(connection);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    api.reset();
    await clearCollections(connection);
    await app.get(IntegrationsService).update("shopee", {
      enabled: true,
      config: {
        partnerId: "1009999",
        shopId: SHOP_ID,
        region: "BR",
        autoSync: true,
        tokenExpiresAt: Date.now() + 3600_000,
      },
      secrets: { partnerKey: "k", accessToken: "t", refreshToken: "r" },
    });
  });

  async function makeProduct(stock: number, variants: { id: string; stock: number }[] = []) {
    const created = await productModel.create({
      name: "Cactos de Mesa",
      slug: `cactos-${Math.random().toString(36).slice(2)}`,
      description: "d",
      shortDescription: "s",
      price: 9900,
      category: "decoracao",
      images: [{ url: "/a.jpg", alt: "a" }],
      variants: variants.map((v) => ({ ...v, name: v.id, priceAdjustment: 0 })),
      ...(variants.length > 0 ? {} : { stock }),
      isAvailable: true,
    });
    return String(created._id);
  }

  /**
   * `mapId` devolve o pedido no formato do fio (`id`), mas o tipo `Order`
   * declara `_id`. Buscar o id pelo código evita um cast que calaria o
   * compilador sem provar nada.
   */
  async function idOf(code: string): Promise<string> {
    const row = await orderModel.findOne({ code }).lean();
    return String(row!._id);
  }

  function orderPayload(productId: string, quantity = 1, variantId?: string) {
    return {
      items: [
        {
          productId,
          name: "Cactos de Mesa",
          ...(variantId ? { variantId } : {}),
          quantity,
          price: 9900,
        },
      ],
      customer: {
        email: "maria@exemplo.com",
        firstName: "Maria",
        lastName: "Souza",
        phone: "83988887777",
      },
      paymentMethod: "pix" as const,
      subtotal: 9900 * quantity,
      total: 9900 * quantity,
    };
  }

  it("criar o pedido compromete o estoque sem baixá-lo", async () => {
    const productId = await makeProduct(5);

    const order = await orders.create(orderPayload(productId, 2));

    expect(order.status).toBe("pending");
    const view = await inventory.getStock({ productId, variantId: "" });
    expect(view).toMatchObject({ onHand: 5, reserved: 2, available: 3 });
  });

  it("pagar o pedido baixa o estoque pelo FEFO", async () => {
    const productId = await makeProduct(5);
    const order = await orders.create(orderPayload(productId, 2));

    await orders.markPaidByCode(order.code);

    const view = await inventory.getStock({ productId, variantId: "" });
    expect(view).toMatchObject({ onHand: 3, reserved: 0, available: 3 });
    const ledger = await inventory.listLedger({ productId, variantId: "" }, 20);
    expect(ledger.filter((e) => e.type === "sale")).toHaveLength(1);
    expect(ledger.find((e) => e.type === "sale")?.orderCode).toBe(order.code);
  });

  /** Notificação repetida do Mercado Pago não pode baixar duas vezes. */
  it("webhook de pagamento repetido baixa uma vez só", async () => {
    const productId = await makeProduct(5);
    const order = await orders.create(orderPayload(productId, 2));

    const first = await orders.markPaidByCode(order.code);
    const second = await orders.markPaidByCode(order.code);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(3);
  });

  it("cancelar antes do pagamento devolve a reserva", async () => {
    const productId = await makeProduct(5);
    const order = await orders.create(orderPayload(productId, 3));

    await orders.updateStatus(await idOf(order.code), "cancelled");

    expect(await inventory.getStock({ productId, variantId: "" })).toMatchObject({
      onHand: 5,
      reserved: 0,
      available: 5,
    });
  });

  /**
   * A diferença que o estado ANTERIOR faz: cancelar um pedido já pago devolve
   * a peça ao estoque; cancelar um pendente só solta a reserva. Olhar só o
   * destino trataria os dois como iguais.
   */
  it("cancelar depois do pagamento devolve a peça ao estoque", async () => {
    const productId = await makeProduct(5);
    const order = await orders.create(orderPayload(productId, 2));
    await orders.markPaidByCode(order.code);
    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(3);

    await orders.updateStatus(await idOf(order.code), "cancelled");

    const view = await inventory.getStock({ productId, variantId: "" });
    expect(view.onHand).toBe(5);
    const ledger = await inventory.listLedger({ productId, variantId: "" }, 20);
    expect(ledger.filter((e) => e.type === "return")).toHaveLength(1);
  });

  it("cancelar duas vezes não devolve estoque duas vezes", async () => {
    const productId = await makeProduct(5);
    const order = await orders.create(orderPayload(productId, 2));
    await orders.markPaidByCode(order.code);

    await orders.updateStatus(await idOf(order.code), "cancelled");
    await orders.updateStatus(await idOf(order.code), "cancelled");

    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(5);
  });

  it("avançar as etapas de produção não mexe mais no estoque", async () => {
    const productId = await makeProduct(5);
    const order = await orders.create(orderPayload(productId, 1));
    await orders.markPaidByCode(order.code);

    for (const status of ["processing", "printing", "finishing", "shipped", "delivered"] as const) {
      await orders.updateStatus(await idOf(order.code), status);
    }

    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(4);
    const ledger = await inventory.listLedger({ productId, variantId: "" }, 30);
    expect(ledger.filter((e) => e.type === "sale")).toHaveLength(1);
  });

  it("reserva a variação escolhida, não o produto inteiro", async () => {
    const productId = await makeProduct(0, [
      { id: "var-verde", stock: 4 },
      { id: "var-terracota", stock: 6 },
    ]);

    await orders.create(orderPayload(productId, 2, "var-verde"));

    expect((await inventory.getStock({ productId, variantId: "var-verde" })).available).toBe(2);
    expect((await inventory.getStock({ productId, variantId: "var-terracota" })).available).toBe(6);
  });

  it("peça sob encomenda é vendida sem saldo e sem estoque negativo", async () => {
    const created = await productModel.create({
      name: "Sob encomenda",
      slug: `encomenda-${Math.random().toString(36).slice(2)}`,
      description: "d",
      shortDescription: "s",
      price: 100,
      category: "personalizados",
      images: [{ url: "/a.jpg", alt: "a" }],
      variants: [],
      isAvailable: true,
    });
    const productId = String(created._id);

    const order = await orders.create(orderPayload(productId, 3));
    await orders.markPaidByCode(order.code);

    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(0);
  });

  /** Caso 1 do enunciado, pelo caminho real: o pedido da loja avisa a Shopee. */
  it("a venda no site enfileira a sincronização do saldo com a Shopee", async () => {
    const productId = await makeProduct(10);
    await links.upsert({
      shopId: SHOP_ID,
      productId,
      itemId: "777",
      status: "active",
    });

    const order = await orders.create(orderPayload(productId, 4));
    await orders.markPaidByCode(order.code);

    const queued = await outbox.list({ topic: STOCK_SYNC_TOPIC });
    expect(queued).toHaveLength(1);
    expect(queued[0].payload).toMatchObject({ shopId: SHOP_ID, productId, variantId: "" });
    // O checkout não esperou a Shopee: nenhuma chamada saiu na hora da venda.
    expect(api.calls).toHaveLength(0);
  });

  it("Shopee desligada não impede a venda nem enfileira nada", async () => {
    await app.get(IntegrationsService).update("shopee", { enabled: false });
    const productId = await makeProduct(6);
    await links.upsert({ shopId: SHOP_ID, productId, itemId: "778", status: "active" });

    const order = await orders.create(orderPayload(productId, 2));
    await orders.markPaidByCode(order.code);

    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(4);
    expect(await outbox.list({ topic: STOCK_SYNC_TOPIC })).toHaveLength(0);
  });
});
