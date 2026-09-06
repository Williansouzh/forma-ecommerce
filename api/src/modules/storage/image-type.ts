/**
 * Descobre o tipo de uma imagem pelos BYTES, não pelo que o cliente afirma.
 *
 * O `Content-Type` do upload é escolhido por quem envia, e o nome do arquivo
 * também. Se qualquer um dos dois decidisse o `Content-Type` gravado no
 * bucket, um arquivo HTML subiria como `image/jpeg` — ou pior, como
 * `text/html`, e passaria a ser servido pelo domínio de imagens.
 *
 * Isso pesa mais aqui do que pesaria em outro projeto: o `next.config.ts` roda
 * com `dangerouslyAllowSVG: true`. SVG é um documento que executa script,
 * então SVG enviado por upload e servido de um domínio nosso é XSS
 * armazenado. Por isso ele é RECUSADO na entrada, não apenas "não otimizado".
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface DetectedImage {
  mime: AllowedImageType;
  extension: "jpg" | "png" | "webp" | "avif";
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Devolve o tipo detectado, ou `null` quando os bytes não são de uma imagem
 * aceita. Nunca adivinha: na dúvida, recusa.
 */
export function detectImage(buffer: Buffer): DetectedImage | null {
  // JPEG: FF D8 FF
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", extension: "png" };
  }

  // WebP: "RIFF" .... "WEBP" — os quatro bytes do meio são o tamanho, e é por
  // isso que não dá para conferir os doze de uma vez.
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { mime: "image/webp", extension: "webp" };
  }

  // AVIF: caixa ISO-BMFF `ftyp` no offset 4, com a marca `avif`/`avis`.
  if (startsWith(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return { mime: "image/avif", extension: "avif" };
    }
  }

  return null;
}

/**
 * Por que o arquivo foi recusado, em texto que serve para mostrar a quem
 * subiu. SVG ganha mensagem própria porque a recusa dele é deliberada, e a
 * pessoa precisa saber que não é defeito.
 */
export function rejectionReason(buffer: Buffer): string {
  const head = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.includes("<svg")) {
    return (
      "SVG não é aceito: ele pode executar script e seria servido de um " +
      "domínio nosso. Converta para PNG ou WebP."
    );
  }
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
    return "O arquivo é HTML, não uma imagem.";
  }
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) {
    return "GIF não é aceito. Use PNG, WebP ou AVIF.";
  }
  return "Formato não reconhecido. Aceitos: JPEG, PNG, WebP e AVIF.";
}
