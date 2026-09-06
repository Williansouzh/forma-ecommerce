import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OutboxService } from "./outbox.service";
import {
  OutboxMessage,
  OutboxMessageSchema,
} from "./schemas/outbox-message.schema";

/**
 * A fila persistente, sozinha e sem saber de Shopee. Quem consome registra o
 * próprio handler — assim um segundo canal de venda não precisa de outra fila.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxMessage.name, schema: OutboxMessageSchema },
    ]),
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
