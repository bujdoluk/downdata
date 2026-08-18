import { NextResponse } from "next/server";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import { fetchStatusBatch } from "@/lib/statusBatch";

export async function GET() {
  const data = await fetchStatusBatch(SERVICE_CATALOG);
  return NextResponse.json(data);
}
