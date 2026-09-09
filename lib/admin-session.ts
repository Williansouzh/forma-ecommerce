/**
 * O nome do cookie de sessão do painel e a base da API, num lugar só.
 *
 * Duas rotas do servidor precisam concordar sobre os dois valores — a que
 * cria a sessão e a que repassa as chamadas com ela. Discordar seria uma
 * falha silenciosa: login funcionando e todo o resto respondendo 401.
 */
export const ADMIN_SESSION_COOKIE = "forma_admin_session";

/** Doze horas — o mesmo `expiresIn` que a API assina no JWT. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * As opções do cookie de sessão, iguais em quem grava e em quem apaga.
 *
 * `secure` segue o PROTOCOLO DA REQUISIÇÃO, não o `NODE_ENV`.
 *
 * Amarrado ao ambiente, ele quebrava toda pilha de produção servida sem TLS —
 * inclusive o `docker-compose.yml` daqui, que roda a imagem de produção em
 * `http://localhost:3222`. O sintoma não dizia nada: o login respondia 200 e
 * gravava o cookie, o navegador se recusava a devolvê-lo por ser `Secure` numa
 * conexão simples, e todas as telas seguintes davam 401 de "sessão expirada".
 *
 * `x-forwarded-proto` é o que o Caddy manda na frente da loja em produção,
 * onde o cookie continua `Secure` como tem de ser.
 */
export function sessionCookieOptions(request: {
  nextUrl: { protocol: string };
  headers: { get(name: string): string | null };
}) {
  const https =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: https,
    path: "/",
  };
}

/**
 * A base da API vista pelo SERVIDOR da loja.
 *
 * `API_URL` existe para quando a loja alcança a API por um endereço interno
 * (rede do compose) diferente do que o navegador usa. Sem ela, cai no mesmo
 * endereço público do resto do site.
 */
export function adminApiUrl(): string {
  const base =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";
  return `${base.replace(/\/$/, "")}/api/v1`;
}
