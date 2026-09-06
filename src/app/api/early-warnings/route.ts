import { NextResponse } from "next/server";
import { getMatchesForOwnKeywords } from "@/features/early-warnings/services/earlyWarnings";

export async function GET() {
  return NextResponse.json({ matches: await getMatchesForOwnKeywords() });
}
