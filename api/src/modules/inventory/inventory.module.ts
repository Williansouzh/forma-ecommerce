import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { StockBatch, StockBatchSchema } from "./schemas/stock-batch.schema";
import {
  StockLedgerEntry,
  StockLedgerEntrySchema,
} from "./schemas/stock-ledger.schema";
import { StockLevel, StockLevelSchema } from "./schemas/stock-level.schema";
import {
  StockReservation,
  StockReservationSchema,
} from "./schemas/stock-reservation.schema";
import { Product, ProductSchema } from "../products/schemas/product.schema";

/**
 * O domínio de estoque. Exporta só o serviço: quem precisa de saldo pede a
 * ele, ninguém alcança os models por fora.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockLevel.name, schema: StockLevelSchema },
      { name: StockBatch.name, schema: StockBatchSchema },
      { name: StockLedgerEntry.name, schema: StockLedgerEntrySchema },
      { name: StockReservation.name, schema: StockReservationSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
