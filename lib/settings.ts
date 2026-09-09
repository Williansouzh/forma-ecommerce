import { cache } from "react";
import {
  FREE_SHIPPING_THRESHOLD,
  PIX_DISCOUNT,
  SITE_NAME,
  WHATSAPP_NUMBER,
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
  // O número que a loja sempre usou, agora como PADRÃO e não como constante
  // cravada: quem manda é o painel, e isto só cobre a API fora do ar.
  whatsappNumber: WHATSAPP_NUMBER,
  // Sem padrão: chave Pix é dado bancário de alguém. Um valor embutido aqui
  // mandaria dinheiro de cliente para a conta errada.
  pixKey: "",
  pixReceiverName: "",
  pixCity: "",
};

/**
 * Leitura no servidor. Nunca lança: se a API estiver fora, a loja segue com
 * as constantes em vez de quebrar a página inteira por um ajuste de frete.
 */
export const getStoreSettings = cache(async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const response = await fetch(`${API_URL}/api/v1/settings`, {
      cache: "no-store",
    });
    if (!response.ok) return FALLBACK_SETTINGS;
    return { ...FALLBACK_SETTINGS, ...((await response.json()) as StoreSettings) };
  } catch {
    return FALLBACK_SETTINGS;
  }
  // `cache`: a mesma requisição pede as configurações em cinco lugares (rodapé,
  // fecho, sob medida, dúvidas, página do produto). Sem isto seriam cinco idas
  // à API para desenhar uma página só.
});

/**
 * O link do WhatsApp da loja, ou `null` quando não há número configurado.
 *
 * `null` é o que faz o botão SUMIR em vez de virar um link para lugar nenhum —
 * antes o número morava em `lib/constants.ts` e não tinha como estar ausente.
 */
export function whatsappUrlFor(
  whatsappNumber: string | undefined,
  text?: string
): string | null {
  const digits = (whatsappNumber ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`;
}

/** Atalho para componentes de servidor, que já podem esperar pela leitura. */
export async function getWhatsappUrl(text?: string): Promise<string | null> {
  const settings = await getStoreSettings();
  return whatsappUrlFor(settings.whatsappNumber, text);
}
