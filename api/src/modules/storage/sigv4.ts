import { createHash, createHmac } from "crypto";

/**
 * Assinatura AWS Signature V4, que é o que o R2 fala pela API S3.
 *
 * Escrita à mão e pura de propósito. O projeto inteiro conversa com serviços
 * externos por `fetch` nativo — Mercado Pago, WhatsApp, Shopee — e trazer o
 * SDK da AWS por causa de dois verbos (PUT e DELETE de objeto) custaria
 * megabytes de dependência transitiva num repositório que audita dependência
 * de produção no CI.
 *
 * O risco de escrever à mão é errar um detalhe do canônico e receber 403 sem
 * explicação. Por isso a função é pura e testada contra os VETORES OFICIAIS
 * da AWS (`aws-sig-v4-test-suite`), não contra o próprio comportamento.
 */

export interface SigV4Input {
  method: string;
  url: URL;
  /**
   * Cabeçalhos a assinar. `host` é derivado da URL quando ausente, e
   * `x-amz-date` é acrescentado — o resto entra exatamente como veio, para que
   * o teste consiga reproduzir os vetores oficiais ao pé da letra.
   */
  headers: Record<string, string>;
  /** SHA-256 do corpo em hex, ou `UNSIGNED-PAYLOAD`. */
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  date: Date;
}

/** `20150830T123600Z` e `20150830`. */
export function amzDate(date: Date): { long: string; short: string } {
  const long = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { long, short: long.slice(0, 8) };
}

/**
 * Codificação RFC 3986. `encodeURIComponent` deixa passar `!'()*`, que a AWS
 * espera codificados — e um objeto com aspas no nome passaria a assinar
 * diferente do que vai no fio.
 */
export function uriEncode(value: string, encodeSlash = true): string {
  let out = "";
  for (const char of value) {
    if (/[A-Za-z0-9\-._~]/.test(char)) {
      out += char;
    } else if (char === "/") {
      out += encodeSlash ? "%2F" : "/";
    } else {
      for (const byte of Buffer.from(char, "utf8")) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
      }
    }
  }
  return out;
}

function canonicalHeaders(headers: Record<string, string>): {
  canonical: string;
  signed: string;
} {
  const normalized = Object.entries(headers)
    .map(([name, value]) => [
      name.toLowerCase().trim(),
      // Espaços sequenciais colapsam; a AWS compara o valor normalizado.
      value.trim().replace(/\s+/g, " "),
    ])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return {
    canonical: normalized.map(([name, value]) => `${name}:${value}\n`).join(""),
    signed: normalized.map(([name]) => name).join(";"),
  };
}

function canonicalQuery(url: URL): string {
  const pairs: [string, string][] = [];
  url.searchParams.forEach((value, key) => pairs.push([key, value]));
  return pairs
    .map(([key, value]): [string, string] => [uriEncode(key), uriEncode(value)])
    .sort(([ka, va], [kb, vb]) => (ka < kb ? -1 : ka > kb ? 1 : va < vb ? -1 : va > vb ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** A chave derivada: data → região → serviço → `aws4_request`. */
export function signingKey(
  secretAccessKey: string,
  shortDate: string,
  region: string,
  service: string,
): Buffer {
  const kDate = createHmac("sha256", `AWS4${secretAccessKey}`).update(shortDate).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

export function buildCanonicalRequest(input: SigV4Input, headers: Record<string, string>): string {
  const { canonical, signed } = canonicalHeaders(headers);
  return [
    input.method.toUpperCase(),
    // O caminho já vem codificado de quem monta a URL; codificar de novo aqui
    // transformaria `%20` em `%2520` e a assinatura deixaria de bater.
    input.url.pathname || "/",
    canonicalQuery(input.url),
    canonical,
    signed,
    input.payloadHash,
  ].join("\n");
}

/**
 * Devolve os cabeçalhos a acrescentar na requisição: `x-amz-date`, `host` e
 * `Authorization`. Não muda a requisição — quem chama decide o que fazer.
 */
export function signAwsV4(input: SigV4Input): Record<string, string> {
  const { long, short } = amzDate(input.date);

  const headers: Record<string, string> = {
    ...input.headers,
    "x-amz-date": long,
  };
  if (!Object.keys(headers).some((name) => name.toLowerCase() === "host")) {
    headers.host = input.url.host;
  }

  const canonicalRequest = buildCanonicalRequest(input, headers);
  const scope = `${short}/${input.region}/${input.service}/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    long,
    scope,
    createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
  ].join("\n");

  const signature = createHmac(
    "sha256",
    signingKey(input.secretAccessKey, short, input.region, input.service),
  )
    .update(stringToSign, "utf8")
    .digest("hex");

  const { signed } = canonicalHeaders(headers);

  return {
    "x-amz-date": long,
    host: headers.host,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signed}, Signature=${signature}`,
  };
}

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** SHA-256 de corpo vazio. Aparece em toda requisição sem payload. */
export const EMPTY_PAYLOAD_SHA256 = sha256Hex("");
