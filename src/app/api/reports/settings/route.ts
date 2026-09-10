import { NextResponse } from "next/server";
import { getReportSettings, syncOwnTimeZone, updateReportSettings } from "@/features/reports/services/reportSettings";

const VALID_INTERVALS = new Set(["daily", "weekly", "monthly"]);

export async function GET() {
  // Passive sync, not a side effect the caller has to trigger separately —
  // see syncOwnTimeZone's own comment for why this is the one place a
  // session-having caller keeps report_settings.time_zone current.
  await syncOwnTimeZone();
  return NextResponse.json(await getReportSettings());
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: Parameters<typeof updateReportSettings>[0] = {};
  if (body.interval !== undefined) {
    if (typeof body.interval !== "string" || !VALID_INTERVALS.has(body.interval)) {
      return NextResponse.json({ error: "interval must be daily, weekly, or monthly." }, { status: 400 });
    }
    patch.interval = body.interval;
  }
  if (body.excludedBoardIds !== undefined) {
    if (!Array.isArray(body.excludedBoardIds) || !body.excludedBoardIds.every((id: unknown) => typeof id === "string")) {
      return NextResponse.json({ error: "excludedBoardIds must be an array of board ids." }, { status: 400 });
    }
    patch.excludedBoardIds = body.excludedBoardIds;
  }
  if (body.emailNudgeEnabled !== undefined) {
    if (typeof body.emailNudgeEnabled !== "boolean") {
      return NextResponse.json({ error: "emailNudgeEnabled must be a boolean." }, { status: 400 });
    }
    patch.emailNudgeEnabled = body.emailNudgeEnabled;
  }

  return NextResponse.json(await updateReportSettings(patch));
}
