import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

// Public: the catalog is public reference data.
export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog);
}
