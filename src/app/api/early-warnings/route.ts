import { NextResponse } from "next/server";
import { getMatchesForOwnKeywords } from "@/lib/earlyWarnings";

export async function GET() {
  return NextResponse.json({ matches: await getMatchesForOwnKeywords() });
}
