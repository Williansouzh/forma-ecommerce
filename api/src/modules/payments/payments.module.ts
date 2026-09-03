import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [IntegrationsModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
