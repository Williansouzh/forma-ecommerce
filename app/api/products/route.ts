import { NextRequest, NextResponse } from "next/server";
import { fetchProducts } from "@/lib/api";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try {
    const data = await fetchProducts({
      category: params.get("category") ?? undefined,
      q: params.get("q") ?? undefined,
      sort:
        (params.get("sort") as
          | "relevance"
          | "price-asc"
          | "price-desc"
          | "newest"
          | null) ?? undefined,
      featured: params.get("featured") === "1",
      limit: params.get("limit") ? Number(params.get("limit")) : undefined,
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
