import { NextResponse } from "next/server";
import { getAllIntegrations } from "@/lib/integrations";

export async function GET() {
  return NextResponse.json(getAllIntegrations());
}
