import { NextResponse } from "next/server";
import { addIntegration, addWebhookTarget, integrationExists, resolveIntegrationBySlug, updateNotifyImpacts } from "@/features/integrations/services/integrations";
import { backfillNewIntegration } from "@/features/integrations/services/backfillNewIntegration";
import { generateWebhookSecret, sendWebhookPing } from "@/features/integrations/services/webhook";
import { ALL_IMPACTS } from "@/components/statusStyles";

// A caller-supplied notifyImpacts on POST is optional and best-effort — an
// invalid/missing one just falls back to the hardcoded default below
// rather than blocking the actual connect, unlike PATCH's strict
// validation (choosing severities is secondary to successfully connecting
// the target itself).
function parseNotifyImpacts(body: unknown): string[] | undefined {
  const notifyImpacts = (body as { notifyImpacts?: unknown })?.notifyImpacts;
  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) return undefined;
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) return undefined;
  return notifyImpacts;
}

// Adds one webhook target. Unlike email/sms, there's no async "confirm
// later" step — the URL is validated (SSRF-safe, see validateWebhookUrl)
// and sent a real test ping synchronously, and the row is only ever
// inserted if that succeeds. Re-submitting an existing URL rotates its
// secret (addWebhookTarget upserts) — the closest equivalent to email's
// "resend," since there's nothing to resend to a machine endpoint.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const value = (body as { value?: unknown })?.value;
  if (typeof value !== "string") {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  // sendWebhookPing validates the URL itself before pinging (see
  // validateWebhookUrl) — no need to call it again here first, that would
  // just be a second DNS lookup for the same answer.
  const secret = generateWebhookSecret();
  const ping = await sendWebhookPing(value, secret);
  if (!ping.ok) {
    return NextResponse.json({ error: ping.reason }, { status: 400 });
  }

  // Backfill (below) only runs on first connect — re-submitting to rotate
  // an existing target's secret, or add another, shouldn't re-touch
  // delivery history. notifyImpacts is likewise only seeded on first
  // connect — passing it on every call would silently reset a
  // since-customized severity filter back to this default (see
  // addIntegration's own comment). Preferring whatever the connect form
  // actually had checked over the hardcoded default: before first connect,
  // there's no integration row yet for a checkbox-toggle PATCH to update,
  // so that's the only way choosing severities before ever connecting
  // actually takes effect.
  const isFirstConnect = !(await integrationExists("webhook"));
  const { id } = await addIntegration({
    slug: "webhook",
    name: "Webhook",
    ...(isFirstConnect ? { notifyImpacts: parseNotifyImpacts(body) ?? ["major", "critical"] } : {}),
  });
  await addWebhookTarget(id, value, secret);

  if (isFirstConnect) {
    // No excludeOpenIncidents narrowing (unlike sms) — a webhook has no
    // per-send cost, so it matches email's "backfill everything" default
    // rather than sms's "still notify about what's happening right now."
    try {
      await backfillNewIntegration(id);
    } catch {
      // ignore — Supabase incident storage is optional; webhook connects either way
    }
  }

  return NextResponse.json({ value, secret });
}

// Edits the severity filter on an already-connected webhook integration —
// separate from POST above, since this never touches targets. Identical
// shape to SMS's PATCH handler (see app/api/integrations/sms/route.ts).
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

  const webhook = await resolveIntegrationBySlug("webhook");
  if (!webhook) {
    return NextResponse.json({ error: "Webhook isn't connected yet." }, { status: 404 });
  }

  await updateNotifyImpacts(webhook.id, notifyImpacts);
  return NextResponse.json({ notifyImpacts });
}
