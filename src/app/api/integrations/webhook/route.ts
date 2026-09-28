import { NextResponse } from "next/server";
import { addIntegration, addWebhookTarget, integrationExists, removeIntegration, resolveIntegrationBySlug, updateNotifyImpacts } from "@/features/integrations/services/integrations";
import { backfillNewIntegration } from "@/features/integrations/services/backfillNewIntegration";
import { generateWebhookSecret, sendWebhookPing } from "@/features/integrations/services/webhook";
import { ALL_IMPACTS } from "@/components/statusStyles";

// Lenient unlike PATCH: a bad value falls back to the default rather than blocking the connect.
function parseNotifyImpacts(body: unknown): string[] | undefined {
  const notifyImpacts = (body as { notifyImpacts?: unknown })?.notifyImpacts;
  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) return undefined;
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) return undefined;
  return notifyImpacts;
}

// No confirm step: the row is inserted only if a synchronous test ping succeeds.
// Re-submitting an existing URL rotates its secret.
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

  // sendWebhookPing already runs the SSRF validation; validating here too would repeat the DNS lookup.
  const secret = generateWebhookSecret();
  const ping = await sendWebhookPing(value, secret);
  if (!ping.ok) {
    return NextResponse.json({ error: ping.reason }, { status: 400 });
  }

  // Backfill and notifyImpacts seeding happen on first connect only, so secret rotation and extra
  // targets never re-touch delivery history or reset a customized filter.
  const isFirstConnect = !(await integrationExists("webhook"));
  const { id } = await addIntegration({
    slug: "webhook",
    name: "Webhook",
    ...(isFirstConnect ? { notifyImpacts: parseNotifyImpacts(body) ?? ["major", "critical"] } : {}),
  });
  await addWebhookTarget(id, value, secret);

  if (isFirstConnect) {
    // Unlike sms, no excludeOpenIncidents: webhooks have no per-send cost, so match email's default.
    try {
      await backfillNewIntegration(id);
    } catch {
      // ignore: the webhook connects even if the backfill fails
    }
  }

  return NextResponse.json({ value, secret });
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

  const webhook = await resolveIntegrationBySlug("webhook");
  if (!webhook) {
    return NextResponse.json({ error: "Webhook isn't connected yet." }, { status: 404 });
  }

  await updateNotifyImpacts(webhook.id, notifyImpacts);
  return NextResponse.json({ notifyImpacts });
}

// This static segment shadows app/api/integrations/[slug], so it needs its own DELETE.
export async function DELETE() {
  const removed = await removeIntegration("webhook");
  if (!removed) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
