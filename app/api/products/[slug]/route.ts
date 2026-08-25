import { NextResponse } from "next/server";

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const response = await fetch(
      `${API_URL}/api/v1/products/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );
    if (!response.ok || response.status === 204) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    const product = await response.json();
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }
}
