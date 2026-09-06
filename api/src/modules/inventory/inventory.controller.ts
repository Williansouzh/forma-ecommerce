import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import {
  AdjustStockDto,
  ReceiveStockDto,
  RegisterLossDto,
} from "./dto/inventory.dto";
import { Roles } from "../../common/decorators/auth.decorators";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/roles";
import { randomUUID } from "crypto";

/**
 * Estoque pelo painel. Tudo aqui é `superadmin` e tudo passa pelo
 * `InventoryService` — não existe rota que escreva saldo por fora do ledger,
 * e é de propósito que não exista.
 */
@Roles("superadmin")
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get(":productId")
  async get(
    @Param("productId") productId: string,
    @Query("variantId") variantId?: string,
  ) {
    const sku = { productId, variantId: variantId ?? "" };
    await this.inventory.ensureTracked(sku);
    const [stock, batches, ledger, audit] = await Promise.all([
      this.inventory.getStock(sku),
      this.inventory.listBatches(sku),
      this.inventory.listLedger(sku, 50),
      this.inventory.auditSku(sku),
    ]);
    return { stock, batches, ledger, audit };
  }

  @Post("receive")
  receive(@Body() dto: ReceiveStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventory.receive(
      { productId: dto.productId, variantId: dto.variantId ?? "" },
      {
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        code: dto.code,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      {
        channel: "ADMIN",
        actor: user.email,
        reason: "Entrada pelo painel",
        correlationId: randomUUID(),
      },
    );
  }

  @Post("adjust")
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventory.adjust(
      { productId: dto.productId, variantId: dto.variantId ?? "" },
      dto.delta,
      {
        channel: "ADMIN",
        actor: user.email,
        reason: dto.reason,
        correlationId: randomUUID(),
      },
    );
  }

  @Post("loss")
  loss(@Body() dto: RegisterLossDto, @CurrentUser() user: AuthenticatedUser) {
    return this.inventory.registerLoss(
      { productId: dto.productId, variantId: dto.variantId ?? "" },
      dto.quantity,
      {
        channel: "ADMIN",
        actor: user.email,
        reason: dto.reason,
        correlationId: randomUUID(),
      },
    );
  }
}
