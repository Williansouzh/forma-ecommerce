import { createHash, timingSafeEqual } from "crypto";
import { isIP } from "net";

/**
 * Quem está do outro lado de uma requisição que diz vir da loja.
 *
 * As rotas públicas de escrita (checkout, orçamento, preferência de
 * pagamento, login do painel) são chamadas pelo SERVIDOR da loja — o BFF no
 * Worker da Cloudflare —, nunca pelo navegador. Isso trazia dois problemas:
 *
 *   - qualquer pessoa chamava essas rotas direto na API, sem passar pela
 *     loja: criar pedidos em laço para prender estoque, ou pedir a cobrança
 *     de qualquer pedido pelo código sequencial;
 *   - o IP que a API via era o do Worker, e não o do cliente. O limite de
 *     tentativas do login contava todo mundo junto: cinco senhas erradas de
 *     qualquer pessoa trancavam o painel para todos, ou o limite se diluía
 *     entre os IPs da Cloudflare e não segurava nada.
 *
 * A loja agora manda `x-store-key` (segredo compartilhado) e `x-client-ip`
 * (o `CF-Connecting-IP` que a Cloudflare lhe entrega). O IP informado só vale
 * quando a chave confere — sem ela, qualquer um escreveria o IP que quisesse.
 */
export const STORE_KEY_HEADER = "x-store-key";
export const CLIENT_IP_HEADER = "x-client-ip";

/** Metadado de `@ThrottleWithoutStoreKey()` — ver `decorators/store.decorators.ts`. */
export const THROTTLE_WITHOUT_STORE_KEY = "throttleWithoutStoreKey";

export interface StoreClient {
  /** A chave confere: a requisição veio do servidor da loja. */
  fromStore: boolean;
  /** O IP a usar para limitar tentativas. */
  ip: string;
}

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

function header(request: RequestLike, name: string): string {
  const value = request.headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Comparação em tempo constante, inclusive quando os tamanhos diferem. */
function sameSecret(received: string, expected: string): boolean {
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function resolveStoreClient(request: RequestLike, storeKey: string): StoreClient {
  const fallbackIp = request.ip ?? "desconhecido";
  const received = header(request, STORE_KEY_HEADER);
  const fromStore = storeKey.length > 0 && received.length > 0 && sameSecret(received, storeKey);
  if (!fromStore) return { fromStore: false, ip: fallbackIp };

  // Só aceita um IP de verdade: o valor vira chave do limitador, e texto
  // livre ali deixaria a loja (ou um bug nela) inventar identidades.
  const informed = header(request, CLIENT_IP_HEADER);
  return { fromStore: true, ip: isIP(informed) ? informed : fallbackIp };
}
