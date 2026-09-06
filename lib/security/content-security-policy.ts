import { configuredImageHost } from "./image-host";

export type CspMode = "off" | "report-only" | "enforce";

/**
 * `CSP_MODE` permite baixar para `report-only` sem mexer em código. O padrão
 * é valer em produção e ficar fora do caminho em desenvolvimento, onde o
 * `next dev` usa `eval` e estilo inline no refresh.
 */
export function configuredCspMode(): CspMode {
  const configured = process.env.CSP_MODE?.trim().toLowerCase();
  if (configured === "off" || configured === "enforce") return configured;
  if (configured === "report-only") return configured;
  return process.env.NODE_ENV === "production" ? "enforce" : "off";
}

/**
 * A política da loja.
 *
 * SOBRE `'unsafe-inline'` NO `script-src`: a primeira versão usava nonce por
 * requisição com `strict-dynamic`, gerado num middleware. Testado no
 * navegador, quebrou nove telas — `/atelier`, `/sobre`, `/checkout`,
 * `/carrinho`, `/busca`, `/politicas`, `/personalizados` e o painel são
 * pré-renderizadas no BUILD, e o HTML estático não tem como carregar um nonce
 * que só existe no request. Sem `strict-dynamic` o problema continua: o Next
 * injeta a carga RSC num `<script>` inline, e sem nonce ela é bloqueada.
 *
 * A saída seria marcar tudo como `force-dynamic` — pagar servidor em toda
 * visita a uma página de políticas para ganhar defesa contra injeção inline.
 * Não compensa nesta loja.
 *
 * O que esta política AINDA protege, e não é pouco:
 *   - script de outra origem (`<script src="evil.com">`) — bloqueado
 *   - sequestro de `<base>` — bloqueado
 *   - clickjacking por iframe — bloqueado
 *   - `<object>`/`<embed>` — bloqueados
 *   - envio de formulário para outra origem — bloqueado
 *   - conteúdo misto em produção — promovido a https
 *
 * O que ela NÃO protege: script inline injetado por XSS. Essa defesa continua
 * sendo o React escapando conteúdo e nenhum `dangerouslySetInnerHTML` com
 * dado de usuário — hoje só há três, todos com JSON-LD que nós montamos.
 */
/**
 * A origem da API, quando ela não é a mesma da loja.
 *
 * O painel fala com a API direto do navegador (`NEXT_PUBLIC_API_URL`), e em
 * desenvolvimento isso é `localhost:4001` contra uma loja em `localhost:3222`
 * — portas diferentes são origens diferentes, e `connect-src 'self'` bloqueia.
 * Foi assim que a primeira versão desta política derrubou o login do painel:
 * a página abria sem violação nenhuma, e só o `fetch` era barrado.
 */
function apiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    const origin = new URL(raw).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const api = apiOrigin();
  const imageHost = configuredImageHost();

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    // `data:` e `blob:` porque o next/image roda com `dangerouslyAllowSVG` e
    // serve placeholder embutido. O host das imagens entra quando o bucket R2
    // está configurado — sem ele aqui, a foto do produto é bloqueada pelo
    // navegador e o resto da página carrega normalmente, que é o tipo de
    // falha que ninguém associa à CSP.
    ["img-src 'self' data: blob:", imageHost?.origin].filter(Boolean).join(" "),
    // Fontes são self-hosted pelo next/font — nada de fonts.gstatic aqui.
    "font-src 'self'",
    `connect-src ${["'self'", api, isProduction ? null : "ws:", isProduction ? null : "wss:"].filter(Boolean).join(" ")}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // O checkout NAVEGA para o Mercado Pago; navegação não passa por
    // `form-action`, então 'self' não atrapalha o pagamento.
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ];
  if (isProduction) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

/** Cabeçalhos baratos que valem mesmo com a CSP desligada. */
export function securityHeaders(): { key: string; value: string }[] {
  const mode = configuredCspMode();
  const headers = [
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    // O filtro XSS legado cria vulnerabilidade própria; a recomendação atual
    // é desligá-lo e confiar na CSP.
    { key: "X-XSS-Protection", value: "0" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "accelerometer=()",
        "browsing-topics=()",
        "camera=()",
        "display-capture=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
      ].join(", "),
    },
  ];

  if (mode !== "off") {
    headers.push({
      key:
        mode === "enforce"
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicy(),
    });
  }

  return headers;
}
