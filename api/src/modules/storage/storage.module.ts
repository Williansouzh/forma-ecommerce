import { Module } from "@nestjs/common";
import { IntegrationsModule } from "../integrations/integrations.module";
import { MediaController } from "./media.controller";
import { R2Client } from "./r2.client";
import { StorageService } from "./storage.service";

/**
 * Armazenamento de mídia. Não conhece produto nem pedido — recebe bytes,
 * devolve URL. Trocar o R2 por outro provedor S3 seria trocar `R2Client`.
 */
@Module({
  imports: [IntegrationsModule],
  controllers: [MediaController],
  providers: [R2Client, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
