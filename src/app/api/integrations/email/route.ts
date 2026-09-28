import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { addIntegration, addRecipient, generateVerification, integrationExists, removeIntegration, resolveIntegrationBySlug, updateNotifyImpacts } from "@/features/integrations/services/integrations";
import { backfillNewIntegration } from "@/features/integrations/services/backfillNewIntegration";
import { getResendClient } from "@/features/integrations/services/resend";
import { emailLogoUrl } from "@/lib/emailLogoUrl";
import ConfirmEmailAddress from "@/components/emails/ConfirmEmailAddress";
import { ALL_IMPACTS } from "@/components/statusStyles";

// WHATWG's <input type="email"> regex: a pragmatic, spec-backed subset of RFC 5322.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Lenient unlike PATCH: a bad value falls back to the default rather than blocking the connect.
function parseNotifyImpacts(body: unknown): string[] | undefined {
  const notifyImpacts = (body as { notifyImpacts?: unknown })?.notifyImpacts;
  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) return undefined;
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) return undefined;
  return notifyImpacts;
}

// Re-submitting an existing address is how "resend confirmation" works (same upsert, fresh code).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const value = (body as { value?: unknown })?.value;
  if (typeof value !== "string" || !EMAIL_PATTERN.test(value)) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    return NextResponse.json({ error: "Email notifications aren't configured yet." }, { status: 500 });
  }

  // Seed notifyImpacts only on first connect, or a later call would reset a customized filter.
  const isFirstConnect = !(await integrationExists("email"));
  const { id } = await addIntegration({
    slug: "email",
    name: "Email",
    ...(isFirstConnect ? { notifyImpacts: parseNotifyImpacts(body) ?? ["major", "critical"] } : {}),
  });

  const { code, expiresAt } = generateVerification("email");
  await addRecipient(id, "email", value, code, expiresAt);

  const verifyUrl = new URL("/api/integrations/email/verify", request.url);
  verifyUrl.searchParams.set("token", code);
  try {
    const element = ConfirmEmailAddress({ verifyUrl: verifyUrl.toString(), logoUrl: emailLogoUrl() });
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    await getResendClient().emails.send({
      from: `downDATA <${from}>`,
      to: value,
      subject: "Confirm your downDATA notification email",
      html,
      text,
    });
  } catch {
    // ignore: the recipient stays pending and "resend" retries
  }

  // First connect only, so adding a recipient or resending never re-touches delivery history.
  if (isFirstConnect) {
    try {
      await backfillNewIntegration(id);
    } catch {
      // ignore: email connects even if the backfill fails
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

  const email = await resolveIntegrationBySlug("email");
  if (!email) {
    return NextResponse.json({ error: "Email isn't connected yet." }, { status: 404 });
  }

  await updateNotifyImpacts(email.id, notifyImpacts);
  return NextResponse.json({ notifyImpacts });
}

// This static segment shadows app/api/integrations/[slug], so it needs its own DELETE.
export async function DELETE() {
  const removed = await removeIntegration("email");
  if (!removed) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
