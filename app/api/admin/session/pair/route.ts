import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  adminApiUrl,
  sessionCookieOptions,
} from "@/lib/admin-session";
import { storeHeaders } from "@/lib/store-api";

/**
 * Entrada do app Minhas Lojas pelo QR code de "App móvel".
 *
 * Mesmo desenho do login em `../route.ts`: a troca do código pelo token
 * acontece aqui, no servidor, com a chave da loja — a API recusa a rota sem
 * ela, como recusa o login. O token volta só como cookie.
 */
export async function POST(request: NextRequest) {
  let code: unknown;
  try {
    ({ code } = (await request.json()) as { code?: unknown });
  } catch {
    return NextResponse.json({ message: "Payload inválido" }, { status: 400 });
  }
  if (typeof code !== "string") {
    return NextResponse.json({ message: "Código ausente" }, { status: 400 });
  }

  const response = await fetch(`${adminApiUrl()}/auth/app-pairing/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...storeHeaders(request) },
    body: JSON.stringify({ code }),
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
    message?: string | string[];
  } | null;

  if (!response.ok || !payload?.accessToken) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message;
    return NextResponse.json(
      { message: message ?? "QR code inválido" },
      { status: response.status === 200 ? 502 : response.status },
    );
  }

  const ok = NextResponse.json({ user: payload.user });
  ok.cookies.set(ADMIN_SESSION_COOKIE, payload.accessToken, {
    ...sessionCookieOptions(request),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return ok;
}
