import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { Order, OrderSchema } from "./schemas/order.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import { InventoryModule } from "../inventory/inventory.module";
import { ShopeeModule } from "../shopee/shopee.module";
import { ProductsModule } from "../products/products.module";
import { SettingsModule } from "../settings/settings.module";
import { SequencesModule } from "../sequences/sequences.module";
import { StoreClientModule } from "../../common/store-client.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    NotificationsModule,
    InventoryModule,
    ShopeeModule,
    // O preço do pedido sai do catálogo e das configurações da loja, não
    // do corpo da requisição — ver `pricing.ts`.
    ProductsModule,
    SettingsModule,
    SequencesModule,
    StoreClientModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
