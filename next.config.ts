import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/content-security-policy";
import { configuredImageHost } from "./lib/security/image-host";

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
};

export default nextConfig;
