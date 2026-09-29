/**
 * Os cabeçalhos com que o SERVIDOR da loja se apresenta à API.
 *
 * `x-store-key` é o segredo compartilhado (`STORE_API_KEY`, o mesmo valor
 * nos dois lados): com ele a API sabe que a chamada veio daqui e não de
 * alguém batendo direto nela. `x-client-ip` é o IP de quem está comprando,
 * para o limite de tentativas contar por cliente — a API só acredita nele
 * quando a chave confere. Ver `api/src/common/store-client.ts`.
 *
 * Sem a variável, não manda nada: a API também não exige enquanto não tiver
 * a sua, e os dois lados podem ser implantados em qualquer ordem.
 *
 * Só para rotas do servidor — o segredo nunca pode chegar ao navegador.
 */
export function storeHeaders(request: {
  headers: { get(name: string): string | null };
}): Record<string, string> {
  const key = process.env.STORE_API_KEY?.trim();
  if (!key) return {};

  // A Cloudflare escreve `CF-Connecting-IP` na borda; o cliente não
  // consegue forjá-lo. Os outros dois cobrem o `next start` atrás de proxy.
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";

  return { "x-store-key": key, ...(ip ? { "x-client-ip": ip } : {}) };
}
