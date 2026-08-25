import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { configuration } from "./config/configuration";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { ProductsModule } from "./modules/products/products.module";
import {
  Product,
  ProductSchema,
} from "./modules/products/schemas/product.schema";
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
    ]),
    AuthModule,
    ProductsModule,
  ],
  controllers: [HealthController],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
