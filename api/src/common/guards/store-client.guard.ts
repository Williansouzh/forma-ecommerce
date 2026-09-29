import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../config/configuration";
import { resolveStoreClient } from "../store-client";

/**
 * Deixa passar só o servidor da loja — quando há chave configurada.
 *
 * Sem `STORE_API_KEY`, a rota fica aberta como sempre foi. É o que permite
 * implantar a loja e a API em qualquer ordem: a chave vai primeiro para os
 * dois lados, e a exigência liga sozinha na API que a recebe. O `main.ts`
 * avisa no boot quando ela falta em produção.
 */
@Injectable()
export class StoreClientGuard implements CanActivate {
  constructor(private readonly config: ConfigService<ApiConfig>) {}

  canActivate(context: ExecutionContext): boolean {
    const key = this.config.get<string>("storeApiKey") ?? "";
    if (!key) return true;

    const request = context.switchToHttp().getRequest();
    if (resolveStoreClient(request, key).fromStore) return true;
    throw new ForbiddenException("Esta rota atende só a loja.");
  }
}
