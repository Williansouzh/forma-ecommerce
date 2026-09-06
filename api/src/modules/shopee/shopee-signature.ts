import { createHmac, timingSafeEqual } from "crypto";

/**
 * Assinatura da Shopee Open Platform, nas duas direções. Puro de propósito:
 * é a única coisa entre um POST anônimo e o estoque da loja, e testar isso
 * não pode depender de rede, banco ou Nest.
 */

/**
 * Assinatura de SAÍDA (API v2).
 *
 * A base é a concatenação crua, sem separador:
 *   `partner_id + path + timestamp` para chamadas públicas (autorização), e
 *   `+ access_token + shop_id` para chamadas no escopo da loja.
 *
 * O `path` é o caminho completo com o prefixo da versão
 * (`/api/v2/product/update_stock`), não só o trecho final — assinar o caminho
 * curto produz um `sign` que a Shopee recusa com `error_sign`.
 */
export function signRequest(input: {
  partnerKey: string;
  partnerId: string;
  path: string;
  timestamp: number;
  accessToken?: string;
  shopId?: string;
}): string {
  const base = [
    input.partnerId,
    input.path,
    String(input.timestamp),
    input.accessToken ?? "",
    input.shopId ?? "",
  ].join("");
  return createHmac("sha256", input.partnerKey).update(base).digest("hex");
}

/**
 * Como a Shopee assina o que ELA manda (push).
 *
 * Duas formas circulam nas implementações públicas, e a documentação oficial
 * não está acessível de onde este código foi escrito para desempatar. As duas
 * estão aqui, escolhidas por configuração, porque adivinhar erraria calado:
 *
 * - `authorization`: header `Authorization` = HMAC(partner_key, url + "|" + corpo).
 *   É a forma mais bem atestada, usada por clientes de longa data.
 * - `x-shopee-signature`: header de mesmo nome = HMAC(partner_key, corpo).
 *
 * Confirme qual vale para o seu app no console da Shopee ANTES de ligar em
 * produção, e ajuste `pushSignatureScheme`. Ver `docs/SHOPEE.md`.
 */
export const PUSH_SIGNATURE_SCHEMES = ["authorization", "x-shopee-signature"] as const;
export type PushSignatureScheme = (typeof PUSH_SIGNATURE_SCHEMES)[number];

export const PUSH_SIGNATURE_HEADER: Record<PushSignatureScheme, string> = {
  authorization: "authorization",
  "x-shopee-signature": "x-shopee-signature",
};

/**
 * A base assinada de um push. Recebe o corpo CRU, em texto — não o objeto já
 * passado por `JSON.parse`/`JSON.stringify`: essa volta reordena chaves e
 * normaliza espaços, e o HMAC deixa de bater por um motivo invisível.
 */
export function pushSignatureBase(
  scheme: PushSignatureScheme,
  url: string,
  rawBody: string,
): string {
  return scheme === "authorization" ? `${url}|${rawBody}` : rawBody;
}

export function signPush(
  partnerKey: string,
  scheme: PushSignatureScheme,
  url: string,
  rawBody: string,
): string {
  return createHmac("sha256", partnerKey)
    .update(pushSignatureBase(scheme, url, rawBody))
    .digest("hex");
}

/**
 * Confere a assinatura de um push em tempo constante.
 *
 * Recusa por omissão: sem segredo gravado, sem header ou com tamanho
 * diferente, é `false`. Aceitar qualquer POST em um endpoint que mexe em
 * estoque seria um convite — o webhook do Mercado Pago já segue esta regra
 * aqui, e não há motivo para a Shopee ser mais frouxa.
 */
export function verifyPushSignature(input: {
  partnerKey?: string;
  scheme: PushSignatureScheme;
  url: string;
  rawBody: string;
  received?: string;
}): boolean {
  if (!input.partnerKey || !input.received) return false;

  const expected = signPush(
    input.partnerKey,
    input.scheme,
    input.url,
    input.rawBody,
  );
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(input.received.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
