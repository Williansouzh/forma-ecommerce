import { Test, TestingModule } from "@nestjs/testing";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { ProductsModule } from "./products.module";
import { ProductsService } from "./products.service";
import { InventoryService } from "../inventory/inventory.service";
import { Product, ProductDocument } from "./schemas/product.schema";
import { clearCollections, ensureIndexes, testMongoModule } from "../../test/mongo";

/**
 * A regra do enunciado: nenhuma quantidade muda ignorando ledger, lotes e
 * reservas — nem quando quem muda é o formulário do painel.
 *
 * O campo continua editável na tela; o que estes casos garantem é que a edição
 * vira um AJUSTE auditável em vez de um `$set` que a próxima venda apagaria.
 */
describe("ProductsService e o ledger", () => {
  let app: TestingModule;
  let products: ProductsService;
  let inventory: InventoryService;
  let productModel: Model<ProductDocument>;
  let connection: Connection;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [testMongoModule("forma_test_products"), ProductsModule],
    }).compile();
    products = app.get(ProductsService);
    inventory = app.get(InventoryService);
    productModel = app.get(getModelToken(Product.name));
    connection = app.get(getConnectionToken());
    await ensureIndexes(connection);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => clearCollections(connection));

  async function makeProduct(stock?: number, variants: { id: string; stock: number }[] = []) {
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

  it("subir o estoque pelo painel vira entrada no ledger", async () => {
    const productId = await makeProduct(4);

    const updated = await products.update(productId, { stock: 10 }, "admin@forma.estudio");

    expect(updated.stock).toBe(10);
    const view = await inventory.getStock({ productId, variantId: "" });
    expect(view.onHand).toBe(10);

    const ledger = await inventory.listLedger({ productId, variantId: "" }, 20);
    const adjustment = ledger.find((e) => e.type === "entry" && e.channel === "ADMIN");
    expect(adjustment?.quantity).toBe(6);
    expect(adjustment?.actor).toBe("admin@forma.estudio");
    expect(adjustment?.reason).toMatch(/4 → 10/);
  });

  it("baixar o estoque pelo painel vira ajuste assinado", async () => {
    const productId = await makeProduct(10);

    await products.update(productId, { stock: 6 }, "admin@forma.estudio");

    expect((await inventory.getStock({ productId, variantId: "" })).onHand).toBe(6);
    const ledger = await inventory.listLedger({ productId, variantId: "" }, 20);
    const adjustment = ledger.find((e) => e.type === "adjustment");
    expect(adjustment).toMatchObject({
      quantity: -4,
      channel: "ADMIN",
      actor: "admin@forma.estudio",
    });
  });

  /**
   * O caso que revela por que a edição não pode ser um `$set`: com 2 unidades
   * reservadas, escrever "8" no campo tem de significar "8 disponíveis", não
   * "8 físicos" — senão o painel diria 8 e o cliente veria 6.
   */
  it("o alvo do campo é o DISPONÍVEL, e o reservado é respeitado", async () => {
    const productId = await makeProduct(10);
    const sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 2, key: "SITE:C3D-1:x" }, { channel: "SITE" });

    await products.update(productId, { stock: 8 }, "admin@forma.estudio");

    const view = await inventory.getStock(sku);
    expect(view.available).toBe(8);
    expect(view.reserved).toBe(2);
    expect(view.onHand).toBe(10);
  });

  it("baixar até o limite do reservado é permitido e para ali", async () => {
    const productId = await makeProduct(5);
    const sku = { productId, variantId: "" };
    await inventory.reserve({ ...sku, quantity: 3, key: "SITE:C3D-2:x" }, { channel: "SITE" });

    // Disponível é 2; zerar o campo tira exatamente essas 2.
    await products.update(productId, { stock: 0 }, "admin@forma.estudio");

    const view = await inventory.getStock(sku);
    expect(view).toMatchObject({ onHand: 3, reserved: 3, available: 0 });
  });

  /**
   * A edição de um campo qualquer não pode fazer a peça sumir. O `$set`
   * reescreve o array de variações e o schema repõe `stock: 0` em cada uma —
   * sem a adoção prévia do saldo, renomear o produto zeraria o estoque das
   * variações.
   */
  it("editar o nome não zera o estoque das variações", async () => {
    const productId = await makeProduct(undefined, [{ id: "var-verde", stock: 4 }]);

    await products.update(
      productId,
      {
        name: "Outro nome",
        variants: [{ id: "var-verde", name: "var-verde", priceAdjustment: 0, stock: 4 }],
      } as never,
      "admin@forma.estudio",
    );

    expect((await inventory.getStock({ productId, variantId: "var-verde" })).onHand).toBe(4);
    const fresh = await productModel.findById(productId).lean();
    expect(fresh?.variants[0].stock).toBe(4);
  });

  it("editar outros campos não mexe no estoque nem cria linha no ledger", async () => {
    const productId = await makeProduct(5);
    await inventory.getStock({ productId, variantId: "" });
    const before = await inventory.listLedger({ productId, variantId: "" }, 20);

    const updated = await products.update(productId, { name: "Cactos de Mesa II" });

    expect(updated.name).toBe("Cactos de Mesa II");
    expect(updated.stock).toBe(5);
    expect(await inventory.listLedger({ productId, variantId: "" }, 20)).toHaveLength(
      before.length,
    );
  });

  it("o estoque de cada variação é ajustado separadamente", async () => {
    const productId = await makeProduct(undefined, [
      { id: "var-verde", stock: 4 },
      { id: "var-terracota", stock: 6 },
    ]);

    await products.update(
      productId,
      {
        variants: [
          { id: "var-verde", name: "var-verde", priceAdjustment: 0, stock: 9 },
          { id: "var-terracota", name: "var-terracota", priceAdjustment: 0, stock: 6 },
        ],
      } as never,
      "admin@forma.estudio",
    );

    expect((await inventory.getStock({ productId, variantId: "var-verde" })).onHand).toBe(9);
    expect((await inventory.getStock({ productId, variantId: "var-terracota" })).onHand).toBe(6);
    // Só a variação que mudou gerou movimentação.
    const terracota = await inventory.listLedger(
      { productId, variantId: "var-terracota" },
      20,
    );
    expect(terracota.filter((e) => e.channel === "ADMIN")).toHaveLength(0);
  });
});
