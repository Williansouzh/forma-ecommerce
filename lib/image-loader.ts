/**
 * Qual arquivo o navegador pede para cada largura.
 *
 * A loja roda em Cloudflare Workers, onde o otimizador do `next/image` é
 * passthrough — `sharp` é binário nativo e não existe lá. Medido: `w=384`,
 * `w=640` e `w=1200` devolviam os mesmos 257.325 bytes do original, e um
 * catálogo de dez peças pesava o arquivo inteiro dez vezes no celular.
 *
 * Quem redimensiona agora é a API, no upload (`api/src/modules/storage/
 * image-variants.ts`), onde roda Node de verdade. Aqui só se escolhe entre o
 * que já existe no bucket — nenhum trabalho em tempo de resposta, nenhuma
 * chamada ao Worker: a `<img>` aponta direto para o R2.
 *
 * REGRA DE OURO: só reescreve URL marcada com `/produtos/w/`. Foto antiga,
 * arquivo em `/public` e qualquer outra origem passam intactos. É o que
 * permitiu ligar isto sem migrar nada — e o que garante que o `srcset` nunca
 * aponte para um arquivo que não está no bucket.
 */

/** Os mesmos degraus que a API grava. Mudar aqui sem mudar lá quebra o par. */
const LARGURAS = [400, 800, 1600];

const MARCADOR = "/produtos/w/";

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function r2ImageLoader({ src, width }: LoaderArgs): string {
  if (!src.includes(MARCADOR)) return src;

  // O primeiro degrau que cobre a largura pedida; acima do último, o maior.
  const escolhida =
    LARGURAS.find((largura) => largura >= width) ?? LARGURAS[LARGURAS.length - 1];

  return src.replace(/\.[a-z0-9]+$/i, `-${escolhida}.webp`);
}
