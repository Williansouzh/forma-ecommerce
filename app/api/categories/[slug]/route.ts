import { NextResponse } from "next/server";
import { getCategory } from "@/data/categories";
import { getProductsByCategory } from "@/data/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }
  return NextResponse.json({
    ...category,
    products: getProductsByCategory(category.slug),
  });
}
