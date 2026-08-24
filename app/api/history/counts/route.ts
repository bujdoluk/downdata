import { NextResponse } from "next/server";
import { getIncidentCountsByService } from "@/lib/getStoredIncident";

export async function GET() {
  const counts = await getIncidentCountsByService();
  return NextResponse.json({ counts });
}
