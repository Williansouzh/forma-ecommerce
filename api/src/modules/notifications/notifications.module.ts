import { Module } from "@nestjs/common";
import { WhatsappService } from "./whatsapp.service";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [IntegrationsModule],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class NotificationsModule {}
