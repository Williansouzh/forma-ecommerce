/**
 * A mensagem de erro da API que pode chegar a quem está comprando.
 *
 * A API responde de dois jeitos:
 *   - `message: string` — as recusas do domínio, escritas para o cliente e em
 *     português ("A cor escolhida para "Vaso" não existe mais.");
 *   - `message: string[]` — o `ValidationPipe`, em inglês e com o nome do
 *     campo ("customer.lastName must be longer than…"), escrito para quem
 *     programa.
 *
 * Antes as duas iam juntas para a tela, e o cliente lia a segunda.
 */
export function customerFacingMessage(
  detail: { message?: string | string[] } | null | undefined,
  fallback: string
): string {
  if (typeof detail?.message === "string" && detail.message.trim()) {
    return detail.message;
  }
  if (Array.isArray(detail?.message)) {
    return "Alguns dados não passaram na conferência. Revise o formulário e tente de novo.";
  }
  return fallback;
}
