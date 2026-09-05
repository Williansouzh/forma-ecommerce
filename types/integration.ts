export type IntegrationKey =
  | "mercadopago"
  | "whatsapp"
  | "melhorenvio"
  | "instagram"
  | "nfe";

export interface Integration {
  key: IntegrationKey;
  enabled: boolean;
  config: Record<string, unknown>;
  /** Credenciais mascaradas — o valor real nunca sai da API. */
  secretHints: Record<string, string>;
}

export interface IntegrationTestResult {
  ok: boolean;
  message: string;
}
