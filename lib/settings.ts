import {
  FREE_SHIPPING_THRESHOLD,
  PIX_DISCOUNT,
  SITE_NAME,
} from "@/lib/constants";
import type { StoreSettings } from "@/types/settings";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** O que a loja usa quando a API não responde — os mesmos valores de sempre. */
export const FALLBACK_SETTINGS: StoreSettings = {
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  pixDiscountPercent: Math.round(PIX_DISCOUNT * 100),
  defaultProductionDays: 5,
  atelierName: SITE_NAME,
  atelierCity: "Campina Grande — PB",
  atelierHours: "Seg a sáb · 8h às 18h",
};

/**
 * Leitura no servidor. Nunca lança: se a API estiver fora, a loja segue com
 * as constantes em vez de quebrar a página inteira por um ajuste de frete.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const response = await fetch(`${API_URL}/api/v1/settings`, {
      cache: "no-store",
    });
    if (!response.ok) return FALLBACK_SETTINGS;
    return { ...FALLBACK_SETTINGS, ...((await response.json()) as StoreSettings) };
  } catch {
    return FALLBACK_SETTINGS;
  }
}
