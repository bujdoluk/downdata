import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitFeatureRequest } from "@/lib/featureRequests";
import { getResendClient } from "@/lib/resend";
import { SUPPORT_EMAIL } from "@/lib/constants";

const MAX_MESSAGE_LENGTH = 500;

// Public (see proxy.ts's PUBLIC_EXACT) — the landing page's RequestCard
// calls this with no session at all.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const kind = (body as { kind?: unknown })?.kind;
  const rawMessage = (body as { message?: unknown })?.message;
  if (kind !== "service" && kind !== "integration") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Please enter a message up to 500 characters." }, { status: 400 });
  }

  // Optional — anonymous landing-page visitors have no session, which is
  // fine here; getUser() just returns null rather than erroring.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await submitFeatureRequest({ kind, message, userId: user?.id ?? null });

  // Best-effort — the request is already saved above, so a notification
  // hiccup (or SUPPORT_EMAIL/RESEND_FROM_EMAIL not being configured yet)
  // shouldn't fail the submission itself.
  const from = process.env.RESEND_FROM_EMAIL;
  if (from) {
    try {
      await getResendClient().emails.send({ from, to: SUPPORT_EMAIL, subject: `New ${kind} request`, text: message });
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}
