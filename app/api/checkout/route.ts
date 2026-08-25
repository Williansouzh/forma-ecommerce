import { NextRequest, NextResponse } from "next/server";
import { getCartTotals } from "@/lib/cart";
import { PIX_DISCOUNT } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }
    if (!payload?.customer?.email?.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    const totals = getCartTotals(items);
    const discount =
      payload.paymentMethod === "pix"
        ? Math.round(totals.subtotal * PIX_DISCOUNT)
        : 0;
    const orderId = `FRMA-${Date.now().toString(36).toUpperCase()}`;

    return NextResponse.json(
      {
        ok: true,
        id: orderId,
        status: "pending",
        totals: { ...totals, discount, total: totals.total - discount },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
