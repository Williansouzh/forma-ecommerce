import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/content-security-policy";
import { configuredImageHost } from "./lib/security/image-host";
import { LEGACY_CATEGORY_MAP } from "./data/categories";

/**
 * O host das imagens tem de constar aqui E na CSP. Os dois leem do mesmo
 * módulo justamente para não divergirem: faltando aqui, o `next/image`
 * responde 400; faltando na CSP, o navegador bloqueia. Nos dois casos a
 * página carrega e só a foto some.
 */
const imageHost = configuredImageHost();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    remotePatterns: imageHost
      ? [{ protocol: imageHost.protocol, hostname: imageHost.hostname }]
      : [],
    /*
     * O redimensionamento saiu do tempo de resposta e foi para o upload.
     *
     * Em Cloudflare Workers o otimizador do Next é passthrough (`sharp` é
     * binário nativo e não roda lá): as três larguras de um card devolviam o
     * mesmo arquivo de 257 KB. Agora a API grava três versões no R2 quando a
     * foto entra, e este loader escolhe entre elas — a `<img>` aponta direto
     * para o bucket, sem passar pelo Worker.
     *
     * Ver `lib/image-loader.ts` e `api/src/modules/storage/image-variants.ts`.
     */
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
  /**
   * Cabeçalhos estáticos em vez de middleware: sem nonce por requisição, não
   * há nada para calcular por visita, e o middleware custaria uma invocação
   * em cada rota. Os detalhes e o que a política protege estão em
   * `lib/security/content-security-policy.ts`.
   */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },

  /**
   * As coleções `geek` e `utilidades` foram aposentadas na migração da
   * taxonomia. As URLs continuam existindo em link compartilhado, no índice do
   * Google e no histórico de quem já comprou — 308 preserva o ranking e não
   * entrega 404 a quem volta.
   *
   * A fonte é o mesmo mapa que a loja e a API usam: aposentar uma categoria
   * passa a criar o redirect sozinho.
   */
  async redirects() {
    return Object.entries(LEGACY_CATEGORY_MAP).map(([from, to]) => ({
      source: `/colecoes/${from}`,
      destination: `/colecoes/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
