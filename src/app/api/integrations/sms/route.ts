import { NextResponse } from "next/server";
import { addIntegration, addRecipient, generateVerification, resolveIntegrationBySlug, integrationExists, removeIntegration, updateNotifyImpacts } from "@/features/integrations/services/integrations";
import { backfillNewIntegration } from "@/features/integrations/services/backfillNewIntegration";
import { sendSms } from "@/features/integrations/services/twilio";
import { ALL_IMPACTS } from "@/components/statusStyles";

// E.164, the format Twilio requires.
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

// Lenient unlike PATCH: a bad value falls back to the default rather than blocking the connect.
function parseNotifyImpacts(body: unknown): string[] | undefined {
  const notifyImpacts = (body as { notifyImpacts?: unknown })?.notifyImpacts;
  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) return undefined;
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) return undefined;
  return notifyImpacts;
}

// Re-submitting an existing number is how "resend the code" works (same upsert, fresh code).
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

  // Backfill and notifyImpacts seeding happen on first connect only, so resends and extra
  // recipients never re-touch delivery history or reset a customized filter.
  const isFirstConnect = !(await integrationExists("sms"));
  const { id } = await addIntegration({
    slug: "sms",
    name: "SMS",
    ...(isFirstConnect ? { notifyImpacts: parseNotifyImpacts(body) ?? ["major", "critical"] } : {}),
  });

  const { code, expiresAt } = generateVerification("sms");
  await addRecipient(id, "sms", value, code, expiresAt);

  try {
    await sendSms({ to: [value], body: `Your downDATA verification code is ${code}` });
  } catch {
    // ignore: the recipient stays pending and "resend" retries
  }

  if (isFirstConnect) {
    // Excludes open incidents so connecting mid-outage still texts about what's broken now.
    try {
      await backfillNewIntegration(id, { excludeOpenIncidents: true });
    } catch {
      // ignore: SMS connects even if the backfill fails
    }
  }

  return NextResponse.json({ value, verified: false });
}

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

  await updateNotifyImpacts(sms.id, notifyImpacts);
  return NextResponse.json({ notifyImpacts });
}

// This static segment shadows app/api/integrations/[slug], so it needs its own DELETE.
export async function DELETE() {
  const removed = await removeIntegration("sms");
  if (!removed) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
