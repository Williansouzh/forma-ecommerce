import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { StoreClientGuard } from "./guards/store-client.guard";
import { ClientThrottlerGuard } from "./guards/client-throttler.guard";

/**
 * O que as rotas `@StoreOnly()` precisam: o armazenamento do limitador e os
 * dois guards. Cada módulo com uma dessas rotas importa este, em vez de
 * depender de o `AuthModule` já ter registrado o throttler — um teste que
 * monta só o módulo de pedidos não passa pelo `AuthModule`.
 *
 * O limite real é declarado por rota; o padrão abaixo só existe porque o
 * módulo exige um.
 */
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  providers: [StoreClientGuard, ClientThrottlerGuard],
  exports: [StoreClientGuard, ClientThrottlerGuard],
})
export class StoreClientModule {}
