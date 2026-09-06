import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { configuration } from "./config/configuration";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomRequestsModule } from "./modules/custom-requests/custom-requests.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { ShopeeModule } from "./modules/shopee/shopee.module";
import { StorageModule } from "./modules/storage/storage.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProductsModule } from "./modules/products/products.module";
import { SettingsModule } from "./modules/settings/settings.module";
import {
  Product,
  ProductSchema,
} from "./modules/products/schemas/product.schema";
import {
  Order,
  OrderSchema,
} from "./modules/orders/schemas/order.schema";
import { HealthController } from "./modules/health/health.controller";
import { SeedService } from "./database/seed.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("mongoUri"),
      }),
    }),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    AuthModule,
    ProductsModule,
    OrdersModule,
    SettingsModule,
    IntegrationsModule,
    InventoryModule,
    OutboxModule,
    ShopeeModule,
    StorageModule,
    CustomRequestsModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
