import { NextResponse } from "next/server";
import { fetchProductBySlug } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const product = await fetchProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }
}
