import type { ShopeeProductLink } from "../schemas/shopee-product-link.schema";

/** O pedido como a Shopee o descreve em `v2.order.get_order_detail`. */
export interface ShopeeOrderDetail {
  order_sn?: string;
  order_status?: string;
  create_time?: number;
  update_time?: number;
  total_amount?: number;
  currency?: string;
  buyer_username?: string;
  recipient_address?: {
    name?: string;
    phone?: string;
    full_address?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    district?: string;
  };
  item_list?: ShopeeOrderItem[];
}

export interface ShopeeOrderItem {
  item_id?: number;
  model_id?: number;
  item_name?: string;
  model_name?: string;
  item_sku?: string;
  model_sku?: string;
  model_quantity_purchased?: number;
  model_discounted_price?: number;
  model_original_price?: number;
}

/** Um item já casado (ou não) com um SKU interno. */
export interface MappedOrderItem {
  itemId: string;
  modelId: string;
  name: string;
  variantName?: string;
  quantity: number;
  /** Preço em CENTAVOS, na convenção do domínio. */
  price: number;
  /** Ausente quando o anúncio não tem associação. */
  link?: ShopeeProductLink;
}

export interface MappedOrder {
  orderSn: string;
  remoteStatus: string;
  items: MappedOrderItem[];
  /** Itens sem associação — o pedido entra mesmo assim, sinalizado. */
  unlinked: MappedOrderItem[];
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  shippingAddress?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  subtotal: number;
  total: number;
}

/**
 * A Shopee fala em unidades da moeda com decimais; o domínio inteiro desta
 * loja fala em CENTAVOS inteiros. A conversão acontece AQUI, no mapper, e em
 * nenhum outro lugar — é o mesmo tratamento que o Mercado Pago recebe.
 *
 * `Math.round` e não `Math.trunc`: 19.99 em ponto flutuante é 19.989999…, e
 * truncar viraria 1998 centavos. Um centavo por item vira diferença de nota.
 */
export function toCents(amount: number | undefined): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Traduz o pedido da Shopee para as formas do domínio.
 *
 * Os dados vêm de fora e são tratados como não confiáveis: nada é assumido
 * presente, quantidade vira inteiro positivo ou o item é descartado, e o
 * casamento com o produto interno é feito SÓ por `item_id`/`model_id` — nunca
 * por nome, nem mesmo como desempate.
 */
export function mapShopeeOrder(
  detail: ShopeeOrderDetail,
  linksByListing: Map<string, ShopeeProductLink>,
): MappedOrder | null {
  const orderSn = detail.order_sn?.trim();
  if (!orderSn) return null;

  const items: MappedOrderItem[] = [];
  const unlinked: MappedOrderItem[] = [];

  for (const raw of detail.item_list ?? []) {
    if (raw.item_id === undefined) continue;
    const quantity = Math.trunc(raw.model_quantity_purchased ?? 0);
    if (quantity <= 0) continue;

    const itemId = String(raw.item_id);
    const modelId = String(raw.model_id ?? 0);
    const link = linksByListing.get(`${itemId}:${modelId}`);

    const mapped: MappedOrderItem = {
      itemId,
      modelId,
      name: raw.item_name?.trim() || `Anúncio ${itemId}`,
      variantName: raw.model_name?.trim() || undefined,
      quantity,
      price: toCents(raw.model_discounted_price ?? raw.model_original_price),
      link,
    };

    items.push(mapped);
    if (!link) unlinked.push(mapped);
  }

  const address = detail.recipient_address;
  const { firstName, lastName } = splitName(
    address?.name || detail.buyer_username || "Comprador Shopee",
  );

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    orderSn,
    remoteStatus: detail.order_status?.trim() ?? "",
    items,
    unlinked,
    customer: {
      // A Shopee não expõe o e-mail do comprador na API de pedidos. Um
      // endereço sintético e ESTÁVEL mantém o campo obrigatório do domínio
      // preenchido sem inventar um contato que não existe — e diz de onde
      // veio, para ninguém tentar responder para ele.
      email: `${orderSn.toLowerCase()}@pedidos.shopee.local`,
      firstName,
      lastName,
      phone: address?.phone?.trim() || "",
    },
    shippingAddress: address?.full_address
      ? {
          street: address.full_address.trim(),
          number: "s/n",
          neighborhood: address.district?.trim() || "",
          city: address.city?.trim() || "",
          state: address.state?.trim() || "",
          zipCode: address.zipcode?.trim() || "",
          country: "BR",
        }
      : undefined,
    subtotal,
    total: detail.total_amount !== undefined ? toCents(detail.total_amount) : subtotal,
  };
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "Comprador",
    lastName: parts.slice(1).join(" ") || "Shopee",
  };
}

/** A chave de reserva de um item, e a razão de a baixa ser idempotente. */
export function reservationKeyFor(
  shopId: string,
  orderSn: string,
  productId: string,
  variantId: string,
): string {
  return `SHOPEE:${shopId}:${orderSn}:${productId}:${variantId}`;
}
