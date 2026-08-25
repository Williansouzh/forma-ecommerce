import { NextResponse } from "next/server";
import { CATEGORIES } from "@/data/categories";

export async function GET() {
  return NextResponse.json(CATEGORIES);
}
