import { NextResponse } from "next/server";
import { addIntegration, addRecipient, generateVerification, resolveIntegrationBySlug, integrationExists, updateSmsNotifyImpacts } from "@/lib/integrations";
import { backfillNewIntegration } from "@/lib/backfillNewIntegration";
import { sendSms } from "@/lib/twilio";
import { ALL_IMPACTS } from "@/components/service/statusStyles";

// E.164 — the format Twilio (and phone numbers generally) require: a
// leading "+", country code, 8-15 digits total, no spaces/punctuation.
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

// Adds one recipient (connecting the sms integration, at the default
// major/critical severity, on first use) and immediately texts it a
// one-time code — nothing is sent to it by the notifier until that code
// is confirmed via POST /api/integrations/sms/verify. Re-submitting an
// already-added number is how "resend the code" works: it's the same
// upsert, with a fresh code and expiry.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const value = (body as { value?: unknown })?.value;
  if (typeof value !== "string" || !PHONE_PATTERN.test(value)) {
    return NextResponse.json({ error: "Phone numbers must be in international format, e.g. +14155550123." }, { status: 400 });
  }

  // Backfill (below) only runs on first connect — re-submitting to add
  // another recipient (or resend) shouldn't re-touch delivery history.
  const isFirstConnect = !(await integrationExists("sms"));
  const { id } = await addIntegration({ slug: "sms", name: "SMS", notifyImpacts: ["major", "critical"] });

  const { code, expiresAt } = generateVerification("sms");
  await addRecipient(id, "sms", value, code, expiresAt);

  // Best-effort — the recipient is already saved as pending at this
  // point, so a Twilio hiccup shouldn't fail the whole request; the user
  // can just hit "resend" (a re-submit of the same number).
  try {
    await sendSms({ to: [value], body: `Your downDATA verification code is ${code}` });
  } catch {
    // ignore
  }

  if (isFirstConnect) {
    // Excludes still-open incidents (see lib/backfillNewIntegration.ts) —
    // connecting SMS while something is actively broken should still text
    // about it on the next cron cycle, not silently swallow it.
    try {
      await backfillNewIntegration(id, { excludeOpenIncidents: true });
    } catch {
      // ignore — Supabase incident storage is optional; SMS connects either way
    }
  }

  return NextResponse.json({ value, verified: false });
}

// Edits the severity filter on an already-connected SMS integration —
// separate from POST above, since this never touches recipients.
export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const notifyImpacts = (body as { notifyImpacts?: unknown })?.notifyImpacts;
  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) {
    return NextResponse.json({ error: "Choose at least one incident severity to notify on." }, { status: 400 });
  }
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) {
    return NextResponse.json({ error: "Unknown incident severity." }, { status: 400 });
  }

  const sms = await resolveIntegrationBySlug("sms");
  if (!sms) {
    return NextResponse.json({ error: "SMS isn't connected yet." }, { status: 404 });
  }

  await updateSmsNotifyImpacts(sms.id, notifyImpacts);
  return NextResponse.json({ notifyImpacts });
}
