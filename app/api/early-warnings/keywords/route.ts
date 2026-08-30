import { NextResponse } from "next/server";
import { getAllKeywordWatches, addKeywordWatch } from "@/lib/earlyWarnings";

export async function GET() {
  return NextResponse.json(await getAllKeywordWatches());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const keyword = typeof body?.keyword === "string" ? body.keyword.trim() : "";

  if (!keyword) {
    return NextResponse.json({ error: "A keyword is required." }, { status: 400 });
  }

  const watch = await addKeywordWatch(keyword);
  return NextResponse.json(watch, { status: 201 });
}
