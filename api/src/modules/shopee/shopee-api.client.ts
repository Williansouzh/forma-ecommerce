import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { signRequest } from "./shopee-signature";

/**
 * Hosts da Shopee Open Platform. O Brasil tem host próprio; o sandbox é
 * global. Configurável por região para não prender a integração a um mercado.
 */
export const SHOPEE_HOSTS = {
  BR: "https://openplatform.shopee.com.br",
  GLOBAL: "https://partner.shopeemobile.com",
  SANDBOX: "https://openplatform.sandbox.test-stable.shopee.sg",
} as const;
export type ShopeeRegionKey = keyof typeof SHOPEE_HOSTS;

export const SHOPEE_AUTH_HOSTS: Record<ShopeeRegionKey, string> = {
  BR: "https://open.shopee.com.br",
  GLOBAL: "https://open.shopee.com",
  SANDBOX: "https://open.sandbox.test-stable.shopee.com",
};

/** Todo caminho da v2 mora sob este prefixo, e é ele que entra na assinatura. */
export const API_PREFIX = "/api/v2";

export interface ShopeeCredentials {
  partnerId: string;
  partnerKey: string;
  region: ShopeeRegionKey;
}

export interface ShopeeShopAuth {
  shopId: string;
  accessToken: string;
}

export interface ShopeeCallOptions {
  method?: "GET" | "POST";
  /** Vai na query string, ASSINADO junto com o resto pelos parâmetros comuns. */
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Ausente = chamada pública (autorização). Presente = escopo de loja. */
  shop?: ShopeeShopAuth;
  timeoutMs?: number;
  correlationId?: string;
}

/**
 * O erro da Shopee, com o suficiente para decidir o que fazer — e nada do que
 * não pode ir para log.
 */
export class ShopeeApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
    readonly correlationId: string,
    /** `true` quando tentar de novo mais tarde tem chance de dar certo. */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ShopeeApiError";
  }
}

/**
 * Erros que a Shopee devolve quando o token não serve mais. Quem chama usa
 * isto para renovar e repetir, em vez de gastar tentativa à toa.
 */
const AUTH_ERROR_CODES = new Set([
  "error_auth",
  "invalid_access_token",
  // A grafia com dois "c" existe mesmo na API; não é engano de digitação aqui.
  "invalid_acceess_token",
  "access_token_error",
]);

/** Erros que valem retentativa: limite de taxa e falha do lado deles. */
const RETRYABLE_CODES = new Set([
  "error_rate_limit",
  "error_busy",
  "error_server",
  "error_inner",
]);

const DEFAULT_TIMEOUT_MS = 15_000;

export function isAuthError(error: unknown): boolean {
  return error instanceof ShopeeApiError && AUTH_ERROR_CODES.has(error.code);
}

export function isRateLimited(error: unknown): boolean {
  return (
    error instanceof ShopeeApiError &&
    (error.code === "error_rate_limit" || error.httpStatus === 429)
  );
}

/**
 * O ÚNICO lugar do sistema que sabe como a Shopee fala.
 *
 * Assina, adiciona os parâmetros comuns, impõe timeout, traduz erro e nada
 * mais: não conhece estoque, pedido nem lote. É o "adapter no limite externo"
 * que o enunciado pede — e é também a única fronteira que os testes mockam,
 * porque é a única coisa aqui que depende da internet.
 */
@Injectable()
export class ShopeeApiClient {
  private readonly logger = new Logger(ShopeeApiClient.name);

  /**
   * Chama um endpoint da v2.
   *
   * `path` é o trecho depois de `/api/v2` (`/product/update_stock`). O
   * prefixo é acrescentado aqui, e a assinatura usa o caminho COMPLETO —
   * assinar o curto é o erro que a Shopee reporta só como `error_sign`.
   */
  async call<T>(
    credentials: ShopeeCredentials,
    path: string,
    options: ShopeeCallOptions = {},
  ): Promise<T> {
    const correlationId = options.correlationId ?? randomUUID();
    const fullPath = `${API_PREFIX}${path}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const sign = signRequest({
      partnerKey: credentials.partnerKey,
      partnerId: credentials.partnerId,
      path: fullPath,
      timestamp,
      accessToken: options.shop?.accessToken,
      shopId: options.shop?.shopId,
    });

    const url = new URL(`${SHOPEE_HOSTS[credentials.region]}${fullPath}`);
    url.searchParams.set("partner_id", credentials.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", sign);
    if (options.shop) {
      url.searchParams.set("access_token", options.shop.accessToken);
      url.searchParams.set("shop_id", options.shop.shopId);
    }
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const method = options.method ?? "GET";
    // `AbortSignal.timeout` em vez de um `setTimeout` solto: sem isto, uma
    // conexão pendurada segura o worker e a mensagem até o lock expirar.
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    }).catch((error: unknown) => {
      const reason = error instanceof Error ? error.name : "erro desconhecido";
      throw new ShopeeApiError(
        reason === "TimeoutError" ? "timeout" : "network_error",
        `Não foi possível alcançar a Shopee (${reason}).`,
        0,
        correlationId,
        true,
      );
    });

    // O corpo é lido como texto primeiro: um 502 do proxy da Shopee vem em
    // HTML, e `response.json()` estouraria com um erro que não diz nada.
    const text = await response.text();
    let payload: ShopeeEnvelope<T>;
    try {
      payload = JSON.parse(text) as ShopeeEnvelope<T>;
    } catch {
      throw new ShopeeApiError(
        "invalid_response",
        `Resposta não-JSON da Shopee (HTTP ${response.status}).`,
        response.status,
        correlationId,
        response.status >= 500 || response.status === 429,
      );
    }

    // A v2 responde 200 mesmo em erro de negócio: quem manda é `error`.
    if (payload.error) {
      const retryable =
        RETRYABLE_CODES.has(payload.error) ||
        response.status === 429 ||
        response.status >= 500;
      this.logger.warn(
        `[${correlationId}] ${method} ${path} → ${payload.error}: ${payload.message ?? ""}`,
      );
      throw new ShopeeApiError(
        payload.error,
        payload.message || payload.error,
        response.status,
        correlationId,
        retryable,
      );
    }

    if (!response.ok) {
      throw new ShopeeApiError(
        `http_${response.status}`,
        `Shopee respondeu ${response.status}.`,
        response.status,
        correlationId,
        response.status >= 500 || response.status === 429,
      );
    }

    return (payload.response ?? (payload as unknown as T)) as T;
  }

  /**
   * A URL para onde o lojista é mandado para autorizar a loja.
   *
   * É uma chamada PÚBLICA assinada: `partner_id + path + timestamp`, sem
   * token — o token é justamente o que ainda não existe neste ponto.
   */
  buildAuthorizationUrl(
    credentials: ShopeeCredentials,
    redirectUri: string,
  ): string {
    const path = `${API_PREFIX}/shop/auth_partner`;
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signRequest({
      partnerKey: credentials.partnerKey,
      partnerId: credentials.partnerId,
      path,
      timestamp,
    });

    const url = new URL(`${SHOPEE_HOSTS[credentials.region]}${path}`);
    url.searchParams.set("partner_id", credentials.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", sign);
    url.searchParams.set("redirect", redirectUri);
    return url.toString();
  }
}

/** O envelope comum de toda resposta da v2. */
interface ShopeeEnvelope<T> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: T;
}
