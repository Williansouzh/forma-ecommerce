/**
 * O host de onde as imagens de produto são servidas (o domínio do bucket R2).
 *
 * Vive sozinho porque DOIS lugares precisam concordar sobre ele, e discordar
 * é uma falha silenciosa:
 *
 *   - a CSP (`img-src`), senão o navegador bloqueia a imagem sem quebrar nada
 *     visível além da própria imagem;
 *   - `next.config.ts` (`images.remotePatterns`), senão o `next/image` recusa
 *     o host e devolve 400 na rota de otimização.
 *
 * Os dois leem daqui. Se um dia divergirem, terá sido porque alguém mudou
 * este arquivo — não porque esqueceu de mudar o outro.
 *
 * É variável de ambiente, e não configuração no banco, porque as duas
 * consumidoras rodam no BUILD: os cabeçalhos do `next.config.ts` são
 * estáticos e o `remotePatterns` é compilado. Ler do Mongo aqui não teria
 * como funcionar.
 */
export const IMAGE_HOST_ENV = "NEXT_PUBLIC_IMAGE_BASE_URL";

export interface ImageHost {
  origin: string;
  hostname: string;
  protocol: "http" | "https";
}

/**
 * Devolve o host configurado, ou `null` quando não há — sem R2 configurado a
 * loja segue servindo de `/public`, que é o estado atual e continua válido.
 *
 * URL malformada devolve `null` em vez de estourar: derrubar o build inteiro
 * (ou toda resposta HTTP, já que a CSP passa por aqui) por causa de uma
 * variável com erro de digitação seria pior que ignorar a variável.
 */
export function configuredImageHost(
  raw: string | undefined = process.env[IMAGE_HOST_ENV],
): ImageHost | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      origin: url.origin,
      hostname: url.hostname,
      protocol: url.protocol === "https:" ? "https" : "http",
    };
  } catch {
    return null;
  }
}
