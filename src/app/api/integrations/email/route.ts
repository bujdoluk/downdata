import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { addIntegration, addRecipient, generateVerification, integrationExists, resolveIntegrationBySlug, updateNotifyImpacts } from "@/features/integrations/services/integrations";
import { backfillNewIntegration } from "@/features/integrations/services/backfillNewIntegration";
import { getResendClient } from "@/features/integrations/services/resend";
import { emailLogoUrl } from "@/lib/emailLogoUrl";
import ConfirmEmailAddress from "@/components/emails/ConfirmEmailAddress";
import { ALL_IMPACTS } from "@/components/statusStyles";

// The WHATWG HTML Living Standard's own email regex — the same one
// browsers use to validate <input type="email">. Full RFC 5322 permits
// far more (quoted local parts, comments, folding whitespace) than any
// real mail provider actually issues addresses under; this is the
// pragmatic, spec-backed middle ground rather than a hand-rolled pattern.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// A caller-supplied notifyImpacts on POST is optional and best-effort — an
// invalid/missing one just falls back to the hardcoded default below
// rather than blocking the actual connect, unlike PATCH's strict
// validation (choosing severities is secondary to successfully connecting
// the address itself).
function parseNotifyImpacts(body: unknown): string[] | undefined {
  const notifyImpacts = (body as { notifyImpacts?: unknown })?.notifyImpacts;
  if (!Array.isArray(notifyImpacts) || notifyImpacts.length === 0) return undefined;
  if (!notifyImpacts.every((impact): impact is string => typeof impact === "string" && ALL_IMPACTS.includes(impact))) return undefined;
  return notifyImpacts;
}

// Adds one recipient (connecting the email integration on first use) and
// emails it a confirmation link — nothing is sent to it by the notifier
// until that link is clicked. Re-submitting an already-added address is
// how "resend the confirmation" works: it's the same upsert, with a
// fresh code and expiry.
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

  // notifyImpacts is likewise only seeded on first connect — passing it on
  // every call would silently reset a since-customized severity filter
  // back to this default (see addIntegration's own comment). Preferring
  // whatever the connect form actually had checked over the hardcoded
  // default: before first connect, there's no integration row yet for a
  // checkbox-toggle PATCH to update, so that's the only way choosing
  // severities before ever connecting actually takes effect.
  const isFirstConnect = !(await integrationExists("email"));
  const { id } = await addIntegration({
    slug: "email",
    name: "Email",
    ...(isFirstConnect ? { notifyImpacts: parseNotifyImpacts(body) ?? ["major", "critical"] } : {}),
  });

  const { code, expiresAt } = generateVerification("email");
  await addRecipient(id, "email", value, code, expiresAt);

  // Best-effort — the recipient is already saved as pending at this
  // point, so an email-sending hiccup shouldn't fail the whole request;
  // the user can just hit "resend" (a re-submit of the same address).
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
    // ignore — the recipient stays pending and "resend" (re-submitting
    // the same address) tries again
  }

  // Only runs once, on first connect — re-submitting to add another
  // recipient (or resend) shouldn't re-touch delivery history.
  if (isFirstConnect) {
    try {
      await backfillNewIntegration(id);
    } catch {
      // ignore — Supabase incident storage is optional; email connects either way
    }
  }

  return NextResponse.json({ value, verified: false });
}

// Edits the severity filter on an already-connected email integration —
// identical shape to SMS/webhook's PATCH handler (see
// app/api/integrations/sms/route.ts).
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
