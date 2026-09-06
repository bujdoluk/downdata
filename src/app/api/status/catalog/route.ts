import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { fetchStatusBatch } from "@/lib/statusBatch";

export async function GET() {
  const data = await fetchStatusBatch(await getCatalog());
  return NextResponse.json(data);
}
