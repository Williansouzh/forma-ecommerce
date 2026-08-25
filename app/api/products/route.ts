import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.toString();
  try {
    const response = await fetch(
      `${API_URL}/api/v1/products${query ? `?${query}` : ""}`,
      { cache: "no-store" }
    );
    if (!response.ok) return NextResponse.json([], { status: 200 });
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
