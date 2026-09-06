import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

// Public, unauthenticated — the catalog is public reference data (see
// lib/catalog.ts). Powers the public navbar's service search and the
// landing footer's Popular Services list, both logged-out surfaces.
export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog);
}
