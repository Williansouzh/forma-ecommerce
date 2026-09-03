import { NextRequest, NextResponse } from "next/server";
import { fetchProducts } from "@/lib/api";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json([]);
  try {
    const data = await fetchProducts({ q: query, limit: 6 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
