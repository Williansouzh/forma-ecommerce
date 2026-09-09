import { NextRequest, NextResponse } from "next/server";
import { getCartTotals } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import type { CartItem } from "@/types/cart";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface CheckoutPayload {
  items?: CartItem[];
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    cpf?: string;
  };
  shippingAddress?: Record<string, string>;
  paymentMethod?: string;
}

export async function POST(request: NextRequest) {
  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
  }
  if (!payload.customer?.email?.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  // Frete grátis e desconto no Pix saem das configurações do ateliê.
  const settings = await getStoreSettings();
  const totals = getCartTotals(items, settings.freeShippingThreshold);
  const discount =
    payload.paymentMethod === "pix"
      ? Math.round((totals.subtotal * settings.pixDiscountPercent) / 100)
      : 0;

  const order = {
    items: items.map((item) => ({
      productId: item.productId,
      name: item.name ?? "Peça",
      // O `variantId` sempre existiu no carrinho e parava aqui. Sem ele, a
      // API não tem como saber DE QUAL variação baixar o estoque — e reservar
      // no produto inteiro venderia a cor errada.
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(item.variantName ? { variantName: item.variantName } : {}),
      quantity: item.quantity,
      price: item.price,
    })),
    customer: {
      email: payload.customer.email,
      firstName: payload.customer.firstName ?? "",
      lastName: payload.customer.lastName ?? "",
      phone: payload.customer.phone ?? "",
      ...(payload.customer.cpf ? { cpf: payload.customer.cpf } : {}),
    },
    ...(payload.shippingAddress
      ? { shippingAddress: { country: "BR", ...payload.shippingAddress } }
      : {}),
    paymentMethod: payload.paymentMethod ?? "pix",
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    discount,
    total: totals.total - discount,
  };

  // O pedido vive na API; esta rota é só a ponte do formulário da loja.
  const response = await fetch(`${API_URL}/api/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    const detail = response
      ? ((await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null)
      : null;
    const message = Array.isArray(detail?.message)
      ? detail.message.join(", ")
      : detail?.message;
    return NextResponse.json(
      { error: message ?? "Não foi possível registrar o pedido" },
      { status: response?.status ?? 502 }
    );
  }

  const created = (await response.json()) as { id: string; code: string };

  /*
   * Como pagar. Com o Mercado Pago ligado, sai um link; sem ele, a API emite
   * a cobrança Pix da própria loja e devolve o "copia e cola".
   *
   * Antes este bloco só buscava `paymentUrl`, e sem Mercado Pago o cliente
   * terminava o checkout numa tela que dizia o número do pedido e mais nada.
   */
  const payment = await fetch(
    `${API_URL}/api/v1/payments/mercadopago/preference`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: created.code }),
      cache: "no-store",
    }
  )
    .then((res) =>
      res.ok
        ? (res.json() as Promise<{
            paymentUrl?: string | null;
            pixCode?: string | null;
            pixKey?: string | null;
            pixReceiverName?: string | null;
          }>)
        : null
    )
    .catch(() => null);

  return NextResponse.json(
    {
      ok: true,
      id: created.id,
      code: created.code,
      status: "pending",
      paymentUrl: payment?.paymentUrl ?? null,
      pix: payment?.pixCode
        ? {
            code: payment.pixCode,
            key: payment.pixKey ?? null,
            receiverName: payment.pixReceiverName ?? null,
          }
        : null,
      // O número vai junto porque a tela de confirmação é componente de
      // cliente: sem isto ela precisaria de uma segunda ida ao servidor só
      // para saber para onde mandar o comprovante.
      whatsappNumber: settings.whatsappNumber ?? "",
      totals: { ...totals, discount, total: totals.total - discount },
    },
    { status: 201 }
  );
}
