import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) return NextResponse.json([]);
  try {
    const response = await fetch(
      `${API_URL}/api/v1/products?q=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return NextResponse.json([]);
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
