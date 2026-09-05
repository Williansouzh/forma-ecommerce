import { NextRequest, NextResponse } from "next/server";
import type { CustomType } from "@/types/custom-request";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const validTypes: CustomType[] = [
  "character",
  "gift",
  "miniature",
  "decoration",
  "functional",
  "other",
];

interface RequestPayload {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  referenceImages?: string[];
  type?: string;
  budget?: number;
  deadline?: string;
}

export async function POST(request: NextRequest) {
  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (!payload.customerName?.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }
  if (!payload.customerEmail?.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (!payload.description?.trim()) {
    return NextResponse.json(
      { error: "Descreva a ideia da peça" },
      { status: 400 }
    );
  }

  // O orçamento vive na API — o painel precisa vê-lo em "Precisa de você".
  const response = await fetch(`${API_URL}/api/v1/custom-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: payload.customerName.trim(),
      customerEmail: payload.customerEmail.trim(),
      description: payload.description.trim(),
      referenceImages: payload.referenceImages ?? [],
      type: validTypes.includes(payload.type as CustomType)
        ? payload.type
        : "other",
      ...(payload.customerPhone ? { customerPhone: payload.customerPhone } : {}),
      ...(typeof payload.budget === "number" ? { budget: payload.budget } : {}),
      ...(payload.deadline ? { deadline: payload.deadline } : {}),
    }),
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
      { error: message ?? "Não foi possível registrar a solicitação" },
      { status: response?.status ?? 502 }
    );
  }

  const created = (await response.json()) as { id: string; code: string };
  return NextResponse.json(
    { ok: true, id: created.id, code: created.code, status: "received" },
    { status: 201 }
  );
}
