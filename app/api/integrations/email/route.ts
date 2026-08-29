import { NextResponse } from "next/server";
import { addIntegration } from "@/lib/integrations";
import { backfillNewIntegration } from "@/lib/backfillNewIntegration";

// The WHATWG HTML Living Standard's own email regex — the same one
// browsers use to validate <input type="email">. Full RFC 5322 permits
// far more (quoted local parts, comments, folding whitespace) than any
// real mail provider actually issues addresses under; this is the
// pragmatic, spec-backed middle ground rather than a hand-rolled pattern.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipientEmails = (body as { recipientEmails?: unknown })?.recipientEmails;
  if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
    return NextResponse.json({ error: "Enter at least one email address." }, { status: 400 });
  }
  if (!recipientEmails.every((email): email is string => typeof email === "string" && EMAIL_PATTERN.test(email))) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }

  await addIntegration({ slug: "email", name: "Email", recipientEmails });

  // Best-effort, same as the Slack connect flow — don't let a backfill
  // hiccup block the connection itself.
  try {
    await backfillNewIntegration("email");
  } catch {
    // ignore — Supabase incident storage is optional; email connects either way
  }

  return NextResponse.json({ slug: "email", name: "Email", recipientEmails });
}
