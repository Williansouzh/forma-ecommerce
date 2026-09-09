import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PixService } from "./pix.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { OrdersModule } from "../orders/orders.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  // `SettingsModule`: a chave Pix, o favorecido e a cidade são configuração da
  // loja, editável no painel — não constante de código.
  imports: [
    IntegrationsModule,
    OrdersModule,
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PixService],
})
export class PaymentsModule {}
