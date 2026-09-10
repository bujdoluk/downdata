import { NextResponse } from "next/server";
import { getAllOwnReports } from "@/features/reports/services/reports";

export async function GET() {
  return NextResponse.json(await getAllOwnReports());
}
