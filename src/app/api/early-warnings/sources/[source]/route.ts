import { NextResponse } from "next/server";
import { setSourceEnabled } from "@/lib/earlyWarnings";
import { resolveKeywordSource } from "@/lib/keywordSources";

export async function PATCH(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  if (!resolveKeywordSource(source)) {
    return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  await setSourceEnabled(source, enabled);
  return NextResponse.json({ source, enabled });
}
