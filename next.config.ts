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
