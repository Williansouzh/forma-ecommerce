import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  adminApiUrl,
} from "@/lib/admin-session";

/**
 * A sessão do painel — criada e destruída aqui, nunca visível ao JavaScript.
 *
 * Antes o `accessToken` do painel morava no `localStorage`. Junto com o
 * `'unsafe-inline'` que a CSP precisa manter (ver
 * `lib/security/content-security-policy.ts`), qualquer XSS na loja lia a
 * sessão de superadmin e tinha 12 horas para usá-la.
 *
 * SOBRE NÃO PÔR O COOKIE DIRETO NA API: a API vive em outro domínio
 * (`API_DOMAIN` no Caddyfile) e a loja em outro. Um cookie emitido lá seria
 * TERCEIRO na loja — exigiria `SameSite=None`, que abre mão da proteção
 * contra CSRF, e ainda assim o Safari o bloquearia por padrão, deixando o
 * painel simplesmente sem funcionar. Emitido aqui ele é primeiro-parte:
 * `SameSite=Lax` barra POST de outro site e nenhum navegador o descarta.
 *
 * O token continua existindo — só que do lado do servidor, adicionado às
 * chamadas por `app/api/admin/[...path]/route.ts`.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ message: "Payload inválido" }, { status: 400 });
  }

  const response = await fetch(`${adminApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json(
      { message: "Não foi possível falar com a API." },
      { status: 502 },
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    accessToken?: string;
    user?: unknown;
    message?: string;
  } | null;

  if (!response.ok || !payload?.accessToken) {
    // O 429 do limite de tentativas chega aqui e precisa passar inteiro: é a
    // diferença entre "senha errada" e "espere um minuto".
    return NextResponse.json(
      { message: payload?.message ?? "Credenciais inválidas" },
      { status: response.status === 200 ? 502 : response.status },
    );
  }

  // Só o usuário volta para o navegador. O token fica no cookie.
  const ok = NextResponse.json({ user: payload.user });
  ok.cookies.set(ADMIN_SESSION_COOKIE, payload.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return ok;
}

/** Sair: o cookie morre aqui, então o navegador não tem como "esquecer" só pela metade. */
export async function DELETE() {
  const response = NextResponse.json({ ended: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
