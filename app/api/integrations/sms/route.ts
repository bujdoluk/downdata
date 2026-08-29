import { NextResponse } from "next/server";
import { addIntegration, integrationExists } from "@/lib/integrations";
import { backfillNewIntegration } from "@/lib/backfillNewIntegration";
import { ALL_IMPACTS } from "@/components/service/statusStyles";

// E.164 — the format Twilio (and phone numbers generally) require: a
// leading "+", country code, 8-15 digits total, no spaces/punctuation.
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { recipientPhones, notifyImpacts } = body as { recipientPhones?: unknown; notifyImpacts?: unknown };

  if (!Array.isArray(recipientPhones) || recipientPhones.length === 0) {
    return NextResponse.json({ error: "Enter at least one phone number." }, { status: 400 });
  }
  if (!recipientPhones.every((phone): phone is string => typeof phone === "string" && PHONE_PATTERN.test(phone))) {
    return NextResponse.json({ error: "Phone numbers must be in international format, e.g. +14155550123." }, { status: 400 });
  }

  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) {
    return NextResponse.json({ error: "Choose at least one incident severity to notify on." }, { status: 400 });
  }
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) {
    return NextResponse.json({ error: "Unknown incident severity." }, { status: 400 });
  }

  // Backfill only runs on first connect — re-submitting this route to
  // edit an already-connected SMS integration (same upsert, see
  // lib/integrations.ts's addIntegration) shouldn't re-touch delivery
  // history.
  const isFirstConnect = !(await integrationExists("sms"));

  // Independent writes (different tables, neither depends on the other's
  // result) — run them together rather than back-to-back. The backfill
  // keeps its own try/catch so a hiccup there still doesn't block the
  // connection, same as the Slack connect flow.
  await Promise.all([
    addIntegration({ slug: "sms", name: "SMS", recipientPhones, notifyImpacts }),
    isFirstConnect
      ? backfillNewIntegration("sms", { excludeOpenIncidents: true }).catch(() => {
          // ignore — Supabase incident storage is optional; SMS connects either way
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ slug: "sms", name: "SMS", recipientPhones, notifyImpacts });
}
