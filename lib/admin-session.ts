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
