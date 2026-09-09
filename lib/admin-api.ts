"use client";

import type { Order, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";
import type {
  Integration,
  IntegrationKey,
  IntegrationTestResult,
} from "@/types/integration";
import type { StoreSettings } from "@/types/settings";
import type { CustomRequest, RequestStatus } from "@/types/custom-request";
import type {
  OutboxStatus,
  PushSignatureScheme,
  ShopeeConnection,
  ShopeeEventRow,
  ShopeeLink,
  ShopeeLinkStatus,
  ShopeeListing,
  ShopeeMetrics,
  ShopeeQueueMessage,
  ShopeeQueueStats,
  ShopeeReconciliationReport,
  ShopeeSuggestion,
  ShopeeSyncResult,
} from "@/types/shopee";
import type { MediaStatus, UploadedImage } from "@/types/media";
import type { components } from "@/types/generated/api-v1";

/**
 * As formas que a API realmente devolve, geradas do contrato OpenAPI.
 *
 * O painel afirmava os tipos de domínio direto sobre o JSON (`as Promise<T>`),
 * sem nada ligando os dois. Foi assim que a vitrine passou a montar
 * `id: undefined` em todo produto: o contrato dizia `_id`, o fio mandava `id`
 * e ninguém checava. Aqui as respostas passam a ser tipadas pelo contrato, e
 * a conversão para o tipo de domínio fica explícita onde as formas diferem.
 */
type ApiProduct = components["schemas"]["Product"];
type ApiOrder = components["schemas"]["Order"];
type ApiCustomRequest = components["schemas"]["CustomRequest"];

/**
 * Trava de compilação, campo a campo.
 *
 * Preferimos isto a `as Promise<T>` em cada chamada — cast cala o compilador
 * sem provar nada. E preferimos campo a campo a um `Api extends Partial<D>`
 * genérico: a versão genérica reprovava sem conseguir dizer QUAL campo
 * divergia, e guarda que fica vermelha sem apontar o lugar é pior que guarda
 * nenhuma.
 *
 * Cada linha abaixo quebra sozinha, com o nome do campo no erro.
 */
/**
 * Em caso de divergência devolve o NOME do campo, não `never`: `never` é
 * atribuível a qualquer tipo, então uma trava que falha para `never` não
 * falha nunca. Já quase passou batido aqui.
 */
type Campo<Api, Dominio, K extends keyof Api & keyof Dominio> =
  Api[K] extends Dominio[K] ? true : K;

const _confere: true[] = [
  null as unknown as Campo<ApiProduct, Product, "id">,
  null as unknown as Campo<ApiProduct, Product, "slug">,
  null as unknown as Campo<ApiProduct, Product, "price">,
  null as unknown as Campo<ApiProduct, Product, "category">,
  null as unknown as Campo<ApiProduct, Product, "isFeatured">,
  null as unknown as Campo<ApiOrder, Order, "id">,
  null as unknown as Campo<ApiOrder, Order, "code">,
  null as unknown as Campo<ApiOrder, Order, "status">,
  null as unknown as Campo<ApiOrder, Order, "total">,
  null as unknown as Campo<ApiOrder, Order, "createdAt">,
  null as unknown as Campo<ApiOrder, Order, "customer">,
  null as unknown as Campo<ApiOrder, Order, "items">,
  null as unknown as Campo<ApiCustomRequest, CustomRequest, "id">,
  null as unknown as Campo<ApiCustomRequest, CustomRequest, "status">,
  null as unknown as Campo<ApiCustomRequest, CustomRequest, "createdAt">,
];
void _confere;

/*
 * O painel fala com a própria loja, não com a API.
 *
 * `/api/admin/*` é um repasse no servidor do Next (ver
 * `app/api/admin/[...path]/route.ts`) que anexa o `Authorization` a partir de
 * um cookie `httpOnly`. Antes o token vinha do `localStorage` e ia daqui
 * mesmo — o que significava que qualquer XSS na loja lia uma sessão de
 * superadmin com 12 horas de validade.
 *
 * Efeito colateral bem-vindo: a origem passa a ser a mesma, então o painel
 * deixa de depender de `connect-src` apontando para o domínio da API.
 */
const BASE = "/api/admin";

/**
 * A criação e a destruição da sessão, que não passam pelo repasse.
 *
 * `/api/admin/session` é uma rota estática e vence o `[...path]` na
 * resolução do Next — ou seja, o repasse nunca vê este caminho. A API também
 * não tem rota chamada `session`, então não há nada inalcançável por causa
 * disto.
 */
const SESSION = "/api/admin/session";

export interface AdminSession {
  accessToken: string;
  user: { sub: string; email: string; name: string; role: string };
}

export interface ProductImageInput {
  url: string;
  alt: string;
}

export type ProductInput = Partial<
  Omit<Product, "id" | "createdAt" | "updatedAt" | "images">
> & {
  images?: ProductImageInput[];
};

/**
 * Encerra a sessão apagando o cookie no servidor.
 *
 * Não há mais `getToken`: o cookie é `httpOnly` e, por desenho, o JavaScript
 * não consegue lê-lo. Quem descobre que a sessão caiu é a resposta 401 —
 * `authFetch` a transforma em `SessaoExpirada`, e o painel redireciona.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(SESSION, { method: "DELETE" });
  } catch {
    // Sem rede não dá para apagar o cookie; o redirecionamento para o login
    // acontece do mesmo jeito, e o cookie expira sozinho em 12h.
  }
}

/** O 401 do painel, para quem chama saber distinguir de um erro qualquer. */
export class SessaoExpirada extends Error {
  constructor() {
    super("Sessão expirada. Faça login novamente.");
    this.name = "SessaoExpirada";
  }
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (response.status === 401) {
    throw new SessaoExpirada();
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? `Erro ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Entra no painel. O token não volta para cá: fica no cookie `httpOnly` que
 * a rota de sessão grava.
 */
export async function login(
  email: string,
  password: string,
): Promise<AdminSession["user"]> {
  const response = await fetch(SESSION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? "Credenciais inválidas");
  }
  const { user } = (await response.json()) as { user: AdminSession["user"] };
  return user;
}

export async function listProducts(): Promise<Product[]> {
  return authFetch<Product[]>("/products?limit=200");
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return authFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<Product> {
  return authFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await authFetch<unknown>(`/products/${id}`, { method: "DELETE" });
}

/**
 * Devolve `null` num 404 — uma API mais antiga que o módulo de pedidos faz o
 * painel mostrar o estado de espera em vez de zeros que pareceriam reais.
 */
export async function listOrders(): Promise<Order[] | null> {
  const response = await fetch(`${BASE}/orders?limit=200`);
  if (response.status === 404) return null;
  if (response.status === 401) {
    throw new SessaoExpirada();
  }
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  return response.json() as Promise<Order[]>;
}

/** O PATCH devolve o pedido e o desfecho do aviso ao cliente. */
export interface OrderStatusUpdate extends Order {
  notification?: { sent: boolean; reason: string };
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<OrderStatusUpdate> {
  return authFetch<OrderStatusUpdate>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getSettings(): Promise<StoreSettings> {
  return authFetch<StoreSettings>("/settings");
}

export async function updateSettings(
  input: Partial<StoreSettings>
): Promise<StoreSettings> {
  return authFetch<StoreSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listIntegrations(): Promise<Integration[]> {
  return authFetch<Integration[]>("/integrations");
}

/**
 * `secrets` é só de escrita: manda o valor novo, e a API devolve de volta
 * apenas a dica mascarada. Campo em branco não apaga o que já está gravado.
 */
export async function updateIntegration(
  key: IntegrationKey,
  input: {
    enabled?: boolean;
    config?: Record<string, unknown>;
    secrets?: Record<string, string>;
    /** Nomes de credenciais a apagar do servidor. */
    removeSecrets?: string[];
  }
): Promise<Integration> {
  return authFetch<Integration>(`/integrations/${key}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function testMercadoPago(): Promise<IntegrationTestResult> {
  return authFetch<IntegrationTestResult>("/integrations/mercadopago/test", {
    method: "POST",
  });
}

// ── Imagens (Cloudflare R2) ────────────────────────────────────────────────

export async function getMediaStatus(): Promise<MediaStatus> {
  return authFetch<MediaStatus>("/media/status");
}

export async function testR2(): Promise<{ ok: boolean; message: string }> {
  return authFetch<{ ok: boolean; message: string }>("/media/test", {
    method: "POST",
  });
}

/**
 * Sobe o arquivo para a API, que assina e grava no R2.
 *
 * O corpo vai CRU, não em `multipart/form-data`: a API já recebe bytes brutos
 * (foi o que a assinatura do webhook da Shopee exigiu), e assim nem o
 * navegador precisa de credencial nem o bucket precisa de política de CORS.
 *
 * O `Content-Type` daqui é só cortesia — quem decide o tipo gravado são os
 * bytes, do lado do servidor.
 */
export async function uploadProductImage(file: File): Promise<UploadedImage> {
  const response = await fetch(`${BASE}/media/products`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (response.status === 401) {
    throw new SessaoExpirada();
  }
  // 413 vem do Express, ANTES do controller, e não traz corpo JSON — sem este
  // caso a pessoa veria "Erro 413" e nenhuma pista do que fazer.
  if (response.status === 413) {
    throw new Error("Arquivo grande demais para o servidor aceitar.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? `Erro ${response.status}`);
  }
  return response.json() as Promise<UploadedImage>;
}

export async function deleteProductImage(key: string): Promise<void> {
  await authFetch<unknown>("/media/products", {
    method: "DELETE",
    body: JSON.stringify({ key }),
  });
}

// ── Shopee ─────────────────────────────────────────────────────────────────

/**
 * A área de Shopee do painel.
 *
 * Nenhuma destas funções recebe ou devolve credencial: `partner_key`, access
 * token e refresh token entram pelo formulário de Integrações (só de escrita,
 * como o do Mercado Pago) e nunca voltam. Aqui trafega estado e comando.
 */
export async function getShopeeConnection(): Promise<ShopeeConnection> {
  return authFetch<ShopeeConnection>("/shopee/connection");
}

export async function getShopeeAuthorizationUrl(
  redirectUri: string
): Promise<{ url: string }> {
  return authFetch<{ url: string }>("/shopee/authorize-url", {
    method: "POST",
    body: JSON.stringify({ redirectUri }),
  });
}

export async function connectShopee(
  code: string,
  shopId: string
): Promise<ShopeeConnection> {
  return authFetch<ShopeeConnection>("/shopee/connect", {
    method: "POST",
    body: JSON.stringify({ code, shopId }),
  });
}

export async function disconnectShopee(): Promise<ShopeeConnection> {
  return authFetch<ShopeeConnection>("/shopee/disconnect", { method: "POST" });
}

export async function updateShopeeSettings(input: {
  autoSync?: boolean;
  defaultSafetyMargin?: number;
  pushSignatureScheme?: PushSignatureScheme;
}): Promise<ShopeeConnection> {
  return authFetch<ShopeeConnection>("/shopee/settings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listShopeeLinks(): Promise<ShopeeLink[]> {
  return authFetch<ShopeeLink[]>("/shopee/links");
}

export async function listShopeeListings(): Promise<ShopeeListing[]> {
  return authFetch<ShopeeListing[]>("/shopee/listings");
}

export async function listShopeeSuggestions(): Promise<ShopeeSuggestion[]> {
  return authFetch<ShopeeSuggestion[]>("/shopee/suggestions");
}

export async function saveShopeeLink(input: {
  productId: string;
  variantId?: string;
  itemId: string;
  modelId?: string;
  shopeeSku?: string;
  status?: ShopeeLinkStatus;
  safetyMargin?: number;
  autoSync?: boolean;
}): Promise<ShopeeLink> {
  return authFetch<ShopeeLink>("/shopee/links", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteShopeeLink(id: string): Promise<void> {
  await authFetch<unknown>(`/shopee/links/${id}`, { method: "DELETE" });
}

export async function syncShopeeSku(
  productId: string,
  variantId?: string
): Promise<ShopeeSyncResult> {
  return authFetch<ShopeeSyncResult>("/shopee/sync", {
    method: "POST",
    body: JSON.stringify({ productId, variantId }),
  });
}

export async function syncAllShopee(): Promise<{ queued: number }> {
  return authFetch<{ queued: number }>("/shopee/sync-all", { method: "POST" });
}

/** `dryRun` lista as divergências sem escrever nada na Shopee. */
export async function reconcileShopee(
  dryRun: boolean
): Promise<ShopeeReconciliationReport> {
  return authFetch<ShopeeReconciliationReport>("/shopee/reconcile", {
    method: "POST",
    body: JSON.stringify({ dryRun }),
  });
}

export async function drainShopeeQueue(): Promise<unknown> {
  return authFetch<unknown>("/shopee/drain", { method: "POST" });
}

export async function pollShopeeOrders(): Promise<{
  found: number;
  enqueued: number;
}> {
  return authFetch<{ found: number; enqueued: number }>("/shopee/poll-orders", {
    method: "POST",
  });
}

export async function listShopeeOrders(): Promise<Order[]> {
  return authFetch<Order[]>("/shopee/orders");
}

export async function listShopeeEvents(): Promise<ShopeeEventRow[]> {
  return authFetch<ShopeeEventRow[]>("/shopee/events");
}

export async function getShopeeQueue(status?: OutboxStatus): Promise<{
  messages: ShopeeQueueMessage[];
  stats: ShopeeQueueStats;
}> {
  const query = status ? `?status=${status}` : "";
  return authFetch<{ messages: ShopeeQueueMessage[]; stats: ShopeeQueueStats }>(
    `/shopee/queue${query}`
  );
}

export async function retryShopeeMessage(input: {
  id?: string;
  topic?: string;
}): Promise<{ retried: number }> {
  return authFetch<{ retried: number }>("/shopee/queue/retry", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getShopeeMetrics(): Promise<ShopeeMetrics> {
  return authFetch<ShopeeMetrics>("/shopee/metrics");
}

/** Devolve `null` num 404, como os pedidos: API velha não derruba o painel. */
export async function listCustomRequests(): Promise<CustomRequest[] | null> {
  const response = await fetch(`${BASE}/custom-requests`);
  if (response.status === 404) return null;
  if (response.status === 401) {
    throw new SessaoExpirada();
  }
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  return response.json() as Promise<CustomRequest[]>;
}

export async function updateCustomRequestStatus(
  id: string,
  status: RequestStatus
): Promise<CustomRequest> {
  return authFetch<CustomRequest>(`/custom-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
