import sharp from "sharp";

/**
 * As versões menores de cada foto, geradas no upload.
 *
 * A loja roda em Cloudflare Workers, onde o otimizador do `next/image` é
 * passthrough: pedir `w=384` devolve o arquivo inteiro, porque `sharp` é
 * binário nativo e não existe em Worker. Medido antes desta mudança, as três
 * larguras de um card devolviam os mesmos 257.325 bytes.
 *
 * Redimensionar em tempo de resposta exigiria um serviço pago. Mas a foto só
 * entra na loja por UM caminho — este upload —, e aqui roda Node numa EC2,
 * onde `sharp` funciona. Então o trabalho é feito uma vez, na entrada, e a
 * loja passa a escolher o arquivo certo por `srcset`.
 */

/**
 * Três larguras, escolhidas pelo que a loja de fato desenha:
 *
 *   400  — card do catálogo (136–320px de CSS, até 2x de densidade)
 *   800  — página do produto e vitrine no celular
 *  1600  — galeria do produto e hero em tela grande, a 2x
 *
 * Mais degraus custariam armazenamento e tempo de upload sem mudar o que o
 * navegador escolhe.
 */
export const VARIANT_WIDTHS = [400, 800, 1600] as const;

/**
 * WebP em 80: para foto de objeto sobre fundo claro, o olho não distingue de
 * 90, e o arquivo cai perto de um terço do JPEG equivalente.
 */
const WEBP_QUALITY = 80;

export interface ImageVariant {
  width: number;
  body: Buffer;
  /** Sempre `webp` — o formato é o mesmo em toda variante, por desenho. */
  contentType: "image/webp";
}

/**
 * Gera as variantes que fazem sentido para ESTA imagem.
 *
 * Uma foto de 500px não ganha versões de 800 e 1600: ampliar não acrescenta
 * detalhe, só peso. `withoutEnlargement` cuida disso no `sharp`, e o filtro
 * aqui evita gravar dois arquivos idênticos no bucket.
 *
 * `rotate()` sem argumento aplica a orientação do EXIF e a descarta — foto de
 * celular que chega deitada sobe deitada sem isto, e o cliente vê a peça de
 * lado no catálogo.
 */
export async function buildVariants(body: Buffer): Promise<ImageVariant[]> {
  const { width: original } = await sharp(body).metadata();
  if (!original) {
    throw new Error("Não foi possível ler a largura da imagem.");
  }

  const alvos = VARIANT_WIDTHS.filter((largura) => largura < original);
  // Imagem menor que o primeiro degrau ainda ganha uma variante: o ganho aqui
  // é o WebP, não o redimensionamento.
  if (alvos.length === 0) alvos.push(VARIANT_WIDTHS[0]);

  return Promise.all(
    alvos.map(async (width) => ({
      width,
      contentType: "image/webp" as const,
      body: await sharp(body)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    })),
  );
}

/**
 * A chave de uma variante, a partir da chave do original.
 *
 * `produtos/w/2026-09-09/<uuid>.jpg` → `produtos/w/2026-09-09/<uuid>-800.webp`
 *
 * O segmento `w/` no caminho é o que diz à loja que existem variantes. Ele é
 * gravado só quando TODAS subiram; assim o `srcset` nunca aponta para um
 * arquivo que não está lá, e as fotos antigas — em `produtos/<data>/` —
 * seguem servidas como sempre foram, sem migração.
 */
export function variantKey(originalKey: string, width: number): string {
  return `${originalKey.replace(/\.[^.]+$/, "")}-${width}.webp`;
}
