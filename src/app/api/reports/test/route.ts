import { NextResponse } from "next/server";
import { sendTestReportEmail } from "@/features/reports/services/reportGeneration";

export async function POST() {
  const { sent, retryAfterSeconds } = await sendTestReportEmail();

  if (retryAfterSeconds !== undefined) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return NextResponse.json({ error: `You've hit the test-email limit. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` }, { status: 429 });
  }
  if (!sent) {
    return NextResponse.json({ error: "Couldn't send the test email. Try again in a moment." }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
