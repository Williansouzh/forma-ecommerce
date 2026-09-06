import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { IntegrationsModule } from "../integrations/integrations.module";
import { InventoryModule } from "../inventory/inventory.module";
import { OutboxModule } from "../outbox/outbox.module";
import { Order, OrderSchema } from "../orders/schemas/order.schema";
import { Product, ProductSchema } from "../products/schemas/product.schema";
import { ShopeeApiClient } from "./shopee-api.client";
import { ShopeeAuthService } from "./shopee-auth.service";
import { ShopeeController } from "./shopee.controller";
import { ShopeeInventoryService } from "./shopee-inventory.service";
import { ShopeeLinkService } from "./shopee-link.service";
import { ShopeeOrderService } from "./shopee-order.service";
import { ShopeeReconciliationService } from "./shopee-reconciliation.service";
import { ShopeeSyncService } from "./shopee-sync.service";
import { ShopeeWebhookController } from "./shopee-webhook.controller";
import { ShopeeEvent, ShopeeEventSchema } from "./schemas/shopee-event.schema";
import {
  ShopeeProductLink,
  ShopeeProductLinkSchema,
} from "./schemas/shopee-product-link.schema";

/**
 * A Shopee como CANAL DE VENDA, não como dona do estoque.
 *
 * O módulo depende do estoque (`InventoryModule`) e da fila (`OutboxModule`);
 * nenhum dos dois depende dele. É essa direção que permite ligar um segundo
 * marketplace amanhã sem tocar em lote, ledger ou FEFO — e é ela que o
 * enunciado pede quando diz para não espalhar código da Shopee pelos domínios.
 *
 * `ShopeeInventoryService` é exportado para que a loja possa avisar da venda
 * do site sem conhecer o resto da integração.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopeeProductLink.name, schema: ShopeeProductLinkSchema },
      { name: ShopeeEvent.name, schema: ShopeeEventSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    IntegrationsModule,
    InventoryModule,
    OutboxModule,
  ],
  controllers: [ShopeeController, ShopeeWebhookController],
  providers: [
    ShopeeApiClient,
    ShopeeAuthService,
    ShopeeLinkService,
    ShopeeInventoryService,
    ShopeeOrderService,
    ShopeeReconciliationService,
    ShopeeSyncService,
  ],
  exports: [ShopeeInventoryService, ShopeeSyncService],
})
export class ShopeeModule {}
