import { ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import type { ApiConfig } from "../../config/configuration";
import { resolveStoreClient, THROTTLE_WITHOUT_STORE_KEY } from "../store-client";

/**
 * O limitador de tentativas, contando por CLIENTE e não por quem repassa.
 *
 * O `ThrottlerGuard` padrão conta por `req.ip`, que aqui é o IP do Worker da
 * loja. Com a chave da loja conferida, este conta pelo `x-client-ip` — o IP
 * de quem está comprando.
 *
 * Sem chave configurada não há como saber quem é o cliente, e limitar por IP
 * do Worker poderia barrar clientes legítimos que compartilham a mesma saída.
 * Nesse caso só as rotas marcadas com `@ThrottleWithoutStoreKey()` (o login,
 * que já era limitado assim) continuam contando; as outras seguem sem limite,
 * como antes.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService<ApiConfig>,
  ) {
    super(options, storage, reflector);
  }

  private storeKey(): string {
    return this.config.get<string>("storeApiKey") ?? "";
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (this.storeKey()) return false;
    const always = this.reflector.getAllAndOverride<boolean>(THROTTLE_WITHOUT_STORE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return !always;
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return resolveStoreClient(req as never, this.storeKey()).ip;
  }

  protected async getErrorMessage(): Promise<string> {
    return "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.";
  }
}
