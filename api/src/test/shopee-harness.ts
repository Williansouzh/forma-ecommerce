import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import type { Connection, Model } from "mongoose";
import { configuration } from "../config/configuration";
import { InventoryModule } from "../modules/inventory/inventory.module";
import { InventoryService } from "../modules/inventory/inventory.service";
import { OutboxModule } from "../modules/outbox/outbox.module";
import { OutboxService } from "../modules/outbox/outbox.service";
import { IntegrationsService } from "../modules/integrations/integrations.service";
import { ShopeeModule } from "../modules/shopee/shopee.module";
import { ShopeeApiClient } from "../modules/shopee/shopee-api.client";
import { ShopeeAuthService } from "../modules/shopee/shopee-auth.service";
import { ShopeeInventoryService } from "../modules/shopee/shopee-inventory.service";
import { ShopeeLinkService } from "../modules/shopee/shopee-link.service";
import { ShopeeOrderService } from "../modules/shopee/shopee-order.service";
import { ShopeeReconciliationService } from "../modules/shopee/shopee-reconciliation.service";
import { ShopeeSyncService } from "../modules/shopee/shopee-sync.service";
import { Product, ProductDocument } from "../modules/products/schemas/product.schema";
import { Order, OrderDocument } from "../modules/orders/schemas/order.schema";
import { FakeShopeeApi } from "./fake-shopee-api";
import { clearCollections, ensureIndexes, testMongoModule } from "./mongo";

export const SHOP_ID = "98765";

export interface ShopeeHarness {
  app: TestingModule;
  api: FakeShopeeApi;
  connection: Connection;
  inventory: InventoryService;
  outbox: OutboxService;
  links: ShopeeLinkService;
  stock: ShopeeInventoryService;
  orders: ShopeeOrderService;
  reconciliation: ShopeeReconciliationService;
  sync: ShopeeSyncService;
  auth: ShopeeAuthService;
  integrations: IntegrationsService;
  productModel: Model<ProductDocument>;
  orderModel: Model<OrderDocument>;
  reset: () => Promise<void>;
  close: () => Promise<void>;
  /** Cria produto e associação prontos para sincronizar. */
  seedLinkedProduct: (input: {
    stock?: number;
    variants?: { id: string; stock: number }[];
    itemId: string;
    modelId?: string;
    variantId?: string;
    safetyMargin?: number;
  }) => Promise<{ productId: string }>;
}

/**
 * Monta o sistema inteiro com Mongo de verdade e SÓ o client da Shopee
 * trocado por um dublê. É esta montagem que faz os testes provarem alguma
 * coisa: a fila, o ledger, os índices únicos e as guardas atômicas são os
 * de produção.
 */
export async function createShopeeHarness(database: string): Promise<ShopeeHarness> {
  const api = new FakeShopeeApi();

  const app = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
      testMongoModule(database),
      InventoryModule,
      OutboxModule,
      ShopeeModule,
    ],
  })
    .overrideProvider(ShopeeApiClient)
    .useValue(api)
    .compile();

  const connection = app.get<Connection>(getConnectionToken());
  await ensureIndexes(connection);

  const integrations = app.get(IntegrationsService);
  const productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));

  const harness: ShopeeHarness = {
    app,
    api,
    connection,
    inventory: app.get(InventoryService),
    outbox: app.get(OutboxService),
    links: app.get(ShopeeLinkService),
    stock: app.get(ShopeeInventoryService),
    orders: app.get(ShopeeOrderService),
    reconciliation: app.get(ShopeeReconciliationService),
    sync: app.get(ShopeeSyncService),
    auth: app.get(ShopeeAuthService),
    integrations,
    productModel,
    orderModel: app.get<Model<OrderDocument>>(getModelToken(Order.name)),

    async reset() {
      api.reset();
      await clearCollections(connection);
      // A integração é gravada de novo a cada caso: os segredos moram no
      // Mongo, e limpar as coleções apaga a conexão junto.
      await integrations.update("shopee", {
        enabled: true,
        config: {
          partnerId: "1009999",
          shopId: SHOP_ID,
          region: "BR",
          autoSync: true,
          defaultSafetyMargin: 0,
          pushSignatureScheme: "authorization",
          tokenExpiresAt: Date.now() + 3600_000,
        },
        secrets: {
          partnerKey: "chave-privada-de-teste",
          accessToken: "token-valido",
          refreshToken: "refresh-valido",
        },
      });
    },

    async close() {
      await app.close();
    },

    async seedLinkedProduct(input) {
      const created = await productModel.create({
        name: "Cactos de Mesa",
        slug: `cactos-${Math.random().toString(36).slice(2)}`,
        description: "d",
        shortDescription: "s",
        price: 9900,
        category: "decoracao",
        images: [{ url: "/a.jpg", alt: "a" }],
        variants: (input.variants ?? []).map((v) => ({
          ...v,
          name: v.id,
          priceAdjustment: 0,
        })),
        ...(input.stock === undefined ? {} : { stock: input.stock }),
        isAvailable: true,
      });
      const productId = String(created._id);

      await harness.links.upsert({
        shopId: SHOP_ID,
        productId,
        variantId: input.variantId ?? "",
        itemId: input.itemId,
        modelId: input.modelId ?? "0",
        status: "active",
        safetyMargin: input.safetyMargin ?? 0,
      });
      return { productId };
    },
  };

  return harness;
}

/** Resposta de sucesso do `update_stock`. */
export function updateStockOk() {
  return { success_list: [{ model_id: 0, stock: 0 }] };
}
