import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // `/admin` entra junto agora que o rodapé linka para ele: a rota
      // responde 200 com a tela de login, e login indexado é conteúdo fino
      // que ainda por cima anuncia a superfície administrativa.
      disallow: ["/checkout", "/carrinho", "/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
