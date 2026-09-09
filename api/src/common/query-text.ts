/**
 * Texto vindo de query string, garantidamente texto.
 *
 * O parser de query do Express é o `qs`, que monta objeto a partir da URL:
 * `?status[$ne]=cancelled` chega como `{ $ne: "cancelled" }`. Onde esse valor
 * entrava direto num filtro do Mongo — `filter.status = query.status` — o
 * cliente escolhia o OPERADOR da consulta, não só o valor.
 *
 * Hoje o estrago é pequeno (as listagens afetadas ou já exigem superadmin, ou
 * devolvem dado público). O problema é o amanhã: no dia em que um desses
 * filtros tocar algo sensível, a brecha já estará lá, escrita há meses e sem
 * ninguém lembrar. Sanear na entrada custa uma função.
 *
 * Objeto e array viram `undefined` — "não filtre por isto" — em vez de erro:
 * query string malformada não é ataque na maioria das vezes, e derrubar a
 * vitrine por causa dela seria pior.
 */
export function queryText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Inteiro positivo vindo de query string, com teto.
 *
 * O teto existe para que `?limit=999999999` não vire uma varredura da coleção
 * inteira servida a quem pediu.
 */
export function queryLimit(
  value: unknown,
  max = 200,
): number | undefined {
  const text = queryText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.floor(parsed), max);
}
