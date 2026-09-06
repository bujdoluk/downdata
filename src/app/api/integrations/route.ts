import { NextResponse } from "next/server";
import { getAllIntegrations } from "@/features/integrations/services/integrations";

export async function GET() {
  return NextResponse.json(await getAllIntegrations());
}
