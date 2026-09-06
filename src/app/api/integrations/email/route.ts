import { NextResponse } from "next/server";
import { addIntegration, addRecipient, generateVerification, integrationExists } from "@/lib/integrations";
import { backfillNewIntegration } from "@/lib/backfillNewIntegration";
import { getResendClient } from "@/lib/resend";

// The WHATWG HTML Living Standard's own email regex — the same one
// browsers use to validate <input type="email">. Full RFC 5322 permits
// far more (quoted local parts, comments, folding whitespace) than any
// real mail provider actually issues addresses under; this is the
// pragmatic, spec-backed middle ground rather than a hand-rolled pattern.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

  const isFirstConnect = !(await integrationExists("email"));
  const { id } = await addIntegration({ slug: "email", name: "Email" });

  const { code, expiresAt } = generateVerification("email");
  await addRecipient(id, "email", value, code, expiresAt);

  // Best-effort — the recipient is already saved as pending at this
  // point, so an email-sending hiccup shouldn't fail the whole request;
  // the user can just hit "resend" (a re-submit of the same address).
  const verifyUrl = new URL("/api/integrations/email/verify", request.url);
  verifyUrl.searchParams.set("token", code);
  try {
    await getResendClient().emails.send({
      from,
      to: value,
      subject: "Confirm your downDATA notification email",
      text: `Click to start receiving incident notifications at this address:\n\n${verifyUrl.toString()}\n\nThis link expires in 24 hours.`,
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
