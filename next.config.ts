import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/content-security-policy";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
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
