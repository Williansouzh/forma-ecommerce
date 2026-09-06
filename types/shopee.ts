/**
 * As formas que a área de Shopee do painel consome.
 *
 * Nenhuma delas carrega token, refresh token ou partner_key: a API devolve
 * ESTADO (conectado, vence em tanto tempo), nunca a credencial. Isso não é
 * detalhe de tipagem — é a regra que impede um segredo de chegar ao navegador.
 */

export type ShopeeRegion = "BR" | "GLOBAL" | "SANDBOX";
export type PushSignatureScheme = "authorization" | "x-shopee-signature";

export interface ShopeeConnection {
  connected: boolean;
  enabled: boolean;
  shopId: string | null;
  region: ShopeeRegion;
  tokenExpiresAt: string | null;
  /** Negativo significa vencido. */
  tokenExpiresInSeconds: number | null;
  hasPartnerKey: boolean;
  hasRefreshToken: boolean;
  pushSignatureScheme: PushSignatureScheme;
  autoSync: boolean;
  defaultSafetyMargin: number;
  lastHealthySyncAt: string | null;
}

export type ShopeeLinkStatus = "active" | "pending" | "disabled" | "error";

export interface ShopeeLink {
  id: string;
  productId: string;
  variantId: string;
  internalSku: string;
  shopId: string;
  itemId: string;
  modelId: string;
  shopeeSku: string;
  status: ShopeeLinkStatus;
  safetyMargin: number;
  autoSync: boolean;
  lastSyncedAt?: string;
  lastPushedStock?: number;
  lastRemoteStock?: number;
  lastRemoteCheckedAt?: string;
  lastError?: string;
  failureCount: number;
}

export interface ShopeeListing {
  itemId: string;
  modelId: string;
  name: string;
  sku: string;
  stock?: number;
}

export interface ShopeeSuggestion {
  productId: string;
  variantId: string;
  productName: string;
  internalSku: string;
  listing: ShopeeListing;
  confidence: "sku-exato" | "ambiguo";
  reason: string;
}

export interface ShopeeDivergence {
  productId: string;
  variantId: string;
  itemId: string;
  modelId: string;
  expected: number;
  remote: number | null;
  corrected: boolean;
  error?: string;
}

export interface ShopeeReconciliationReport {
  correlationId: string;
  startedAt: string;
  finishedAt: string;
  checked: number;
  divergences: ShopeeDivergence[];
  corrected: number;
  failed: number;
  dryRun: boolean;
}

export type OutboxStatus = "pending" | "processing" | "done" | "dead";

export interface ShopeeQueueMessage {
  id: string;
  topic: string;
  dedupeKey: string;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError?: string;
  correlationId?: string;
  updatedAt: string;
}

export interface ShopeeQueueStats {
  pending: number;
  processing: number;
  done: number;
  dead: number;
}

export interface ShopeeEventRow {
  id: string;
  key: string;
  shopId: string;
  orderSn: string;
  eventType: string;
  pushCode?: number;
  status: "received" | "processed" | "ignored" | "failed";
  outcome?: string;
  correlationId?: string;
  createdAt: string;
}

export interface ShopeeMetrics {
  worker: {
    processed: number;
    succeeded: number;
    failed: number;
    dead: number;
    rateLimited: number;
    lastRunAt: string | null;
    lastRunDurationMs: number | null;
    lastHealthyRunAt: string | null;
    ordersImported: number;
    duplicatesIgnored: number;
  };
  queue: ShopeeQueueStats;
  reconciliationRunning: boolean;
  lastHealthySyncAt: string | null;
}

export interface ShopeeSyncResult {
  ok: boolean;
  reason: string;
  pushedStock?: number;
  correlationId?: string;
}
