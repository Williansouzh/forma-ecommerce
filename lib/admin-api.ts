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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = `${API_URL}/api/v1`;
const TOKEN_KEY = "forma-admin-token";

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

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401) {
    clearToken();
    throw new Error("Sessão expirada. Faça login novamente.");
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

export async function login(email: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${BASE}/auth/login`, {
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
  const session = (await response.json()) as AdminSession;
  saveToken(session.accessToken);
  return session;
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
  const token = getToken();
  const response = await fetch(`${BASE}/orders?limit=200`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 404) return null;
  if (response.status === 401) {
    clearToken();
    throw new Error("Sessão expirada. Faça login novamente.");
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
  const token = getToken();
  const response = await fetch(`${BASE}/custom-requests`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 404) return null;
  if (response.status === 401) {
    clearToken();
    throw new Error("Sessão expirada. Faça login novamente.");
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
