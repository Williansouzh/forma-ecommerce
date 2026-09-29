import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { StoreClientGuard } from "../guards/store-client.guard";
import { ClientThrottlerGuard } from "../guards/client-throttler.guard";
import { THROTTLE_WITHOUT_STORE_KEY } from "../store-client";

/**
 * Rota chamada só pelo servidor da loja: exige a chave compartilhada (quando
 * configurada) e limita as tentativas por cliente — `limit` requisições a
 * cada `ttlMs`, contadas pelo IP de quem está comprando.
 *
 * Ver `common/store-client.ts` para o porquê.
 */
export const StoreOnly = (limit: number, ttlMs: number) =>
  applyDecorators(
    UseGuards(StoreClientGuard, ClientThrottlerGuard),
    Throttle({ default: { limit, ttl: ttlMs } }),
  );

/**
 * Mantém o limite mesmo sem chave configurada, contando pelo IP que chega.
 * É o comportamento que o login já tinha — perder isso seria abrir a senha
 * do painel a tentativas sem custo enquanto a chave não é configurada.
 */
export const ThrottleWithoutStoreKey = () => SetMetadata(THROTTLE_WITHOUT_STORE_KEY, true);
