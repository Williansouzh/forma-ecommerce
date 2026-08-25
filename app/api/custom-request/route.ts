import { NextRequest, NextResponse } from "next/server";
import type { CustomType } from "@/types/custom-request";

const validTypes: CustomType[] = [
  "character",
  "gift",
  "miniature",
  "decoration",
  "functional",
  "other",
];

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!payload?.customerName?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }
    if (!payload?.customerEmail?.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    if (!payload?.description?.trim()) {
      return NextResponse.json(
        { error: "Descreva a ideia da peça" },
        { status: 400 }
      );
    }

    const id = `CR-${Date.now().toString(36).toUpperCase()}`;
    console.log("[custom-request]", id, {
      name: payload.customerName,
      email: payload.customerEmail,
      type: validTypes.includes(payload.type) ? payload.type : "other",
    });

    return NextResponse.json({ ok: true, id, status: "received" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
}
