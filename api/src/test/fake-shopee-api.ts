import { ShopeeApiError, type ShopeeCallOptions, type ShopeeCredentials } from "../modules/shopee/shopee-api.client";

export interface RecordedCall {
  path: string;
  options: ShopeeCallOptions;
}

type Handler = (options: ShopeeCallOptions) => unknown;

/**
 * A Shopee de mentira — e o ÚNICO mock da suíte.
 *
 * O enunciado é explícito: mock só no limite externo da API. Tudo abaixo
 * dele (estoque, lotes, FEFO, reserva, fila, idempotência, pedidos) roda de
 * verdade contra o Mongo nos testes que usam esta classe. Um mock do
 * `InventoryService` faria os testes de concorrência e de baixa dupla
 * passarem sem provar nada, porque é justamente o comportamento real do banco
 * que eles verificam.
 *
 * Registra tudo o que foi chamado, para que o teste possa afirmar QUE número
 * foi enviado — e não só que "não deu erro".
 */
export class FakeShopeeApi {
  readonly calls: RecordedCall[] = [];
  private readonly handlers = new Map<string, Handler>();
  /** Falhas programadas por caminho, consumidas uma a uma. */
  private readonly failures = new Map<string, (ShopeeApiError | Error)[]>();

  on(path: string, handler: Handler): this {
    this.handlers.set(path, handler);
    return this;
  }

  /** Enfileira falhas para as próximas chamadas de um caminho. */
  failNext(path: string, ...errors: (ShopeeApiError | Error)[]): this {
    this.failures.set(path, [...(this.failures.get(path) ?? []), ...errors]);
    return this;
  }

  callsTo(path: string): RecordedCall[] {
    return this.calls.filter((call) => call.path === path);
  }

  reset(): void {
    this.calls.length = 0;
    this.handlers.clear();
    this.failures.clear();
  }

  async call<T>(
    _credentials: ShopeeCredentials,
    path: string,
    options: ShopeeCallOptions = {},
  ): Promise<T> {
    this.calls.push({ path, options });

    const queued = this.failures.get(path);
    if (queued && queued.length > 0) throw queued.shift()!;

    const handler = this.handlers.get(path);
    if (!handler) {
      throw new ShopeeApiError(
        "not_stubbed",
        `Chamada não prevista no teste: ${path}`,
        400,
        "test",
        false,
      );
    }
    return handler(options) as T;
  }

  buildAuthorizationUrl(): string {
    return "https://open.shopee.com.br/api/v2/shop/auth_partner?partner_id=1&sign=x";
  }
}

/** Erros da Shopee com a forma exata que o client produziria. */
export const shopeeErrors = {
  rateLimit: () =>
    new ShopeeApiError("error_rate_limit", "Limite de requisições atingido.", 429, "test", true),
  timeout: () =>
    new ShopeeApiError("timeout", "Não foi possível alcançar a Shopee (TimeoutError).", 0, "test", true),
  serverError: () =>
    new ShopeeApiError("error_server", "Erro interno da Shopee.", 500, "test", true),
  expiredToken: () =>
    new ShopeeApiError("invalid_access_token", "Access token inválido ou expirado.", 200, "test", false),
  permanent: () =>
    new ShopeeApiError("error_param", "item_id inexistente.", 200, "test", false),
};
