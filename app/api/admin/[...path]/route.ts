import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminApiUrl,
  sessionCookieOptions,
} from "@/lib/admin-session";

/**
 * O painel fala com a API por aqui, e não mais direto do navegador.
 *
 * É o que permite a sessão viver num cookie `httpOnly` de primeira parte: o
 * token nunca chega ao JavaScript, e é este handler — no servidor — que o
 * anexa como `Authorization`. Um XSS na loja passa a não ter o que roubar.
 *
 * O caminho é repassado tal e qual: `/api/admin/products?limit=200` vira
 * `${API}/api/v1/products?limit=200`. Nada de lista de rotas permitidas
 * mantida à mão aqui — ela divergiria da API na primeira rota nova, e quem
 * autoriza de verdade continua sendo o guard do outro lado, que não confia
 * em quem chama.
 */

const METODOS_SEM_CORPO = new Set(["GET", "HEAD"]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Sessão expirada. Faça login novamente." },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const url = `${adminApiUrl()}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  // O envio de imagem manda bytes crus com o tipo do arquivo; forçar JSON
  // aqui faria o parser da API recusar o corpo antes do controller.
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const semCorpo = METODOS_SEM_CORPO.has(request.method);
  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: semCorpo ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json(
      { message: "Não foi possível falar com a API." },
      { status: 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });

  // Token recusado lá é sessão morta aqui: apagar o cookie evita que o painel
  // fique num laço de 401 com um cookie que já não vale nada.
  if (upstream.status === 401) {
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      ...sessionCookieOptions(request),
      maxAge: 0,
    });
  }

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
