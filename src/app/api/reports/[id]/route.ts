import { NextResponse } from "next/server";
import { deleteOwnReport } from "@/features/reports/services/reports";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await deleteOwnReport(id))) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
