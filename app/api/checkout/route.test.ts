import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

/** O pedido como o carrinho o manda: a peça a R$ 100,00, preço de ontem. */
function checkoutRequest() {
  return new NextRequest("http://loja/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "p1", name: "Vaso", quantity: 1, price: 10000 }],
      customer: { email: "ana@exemplo.com", firstName: "Ana", lastName: "", phone: "83988887777" },
      paymentMethod: "pix",
    }),
  });
}

/** Responde como a API: configurações, pedido gravado e preferência. */
function fakeApi(order: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.endsWith("/settings")) {
      return Response.json({ freeShippingThreshold: 40000, pixDiscountPercent: 5, whatsappNumber: "" });
    }
    if (href.endsWith("/orders")) return Response.json(order, { status: 201 });
    if (href.endsWith("/preference")) return Response.json({ pixCode: "000201…" });
    throw new Error(`chamada inesperada: ${href}`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/checkout", () => {
  /**
   * O preço subiu desde que a peça entrou na sacola. O Pix é montado pela API
   * com o total gravado; a tela precisa mostrar esse mesmo número, e não o
   * que o carrinho calculou com o preço antigo.
   */
  it("devolve os totais do pedido gravado, não os do carrinho", async () => {
    vi.stubGlobal(
      "fetch",
      fakeApi({ id: "o1", code: "C3D-4900", subtotal: 12000, shipping: 2990, discount: 600, total: 14390 })
    );

    const response = await POST(checkoutRequest());
    const body = (await response.json()) as { totals: Record<string, number> };

    expect(response.status).toBe(201);
    expect(body.totals).toMatchObject({ subtotal: 12000, shipping: 2990, discount: 600, total: 14390 });
  });

  it("recusa do domínio chega ao cliente; a lista do ValidationPipe, não", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) =>
        String(url).endsWith("/settings")
          ? Response.json({})
          : Response.json({ message: ["customer.phone must be longer than or equal to 8 characters"] }, { status: 400 })
      )
    );

    const response = await POST(checkoutRequest());
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).not.toMatch(/must be/);
  });
});
