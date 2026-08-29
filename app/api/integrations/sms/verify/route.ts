import { NextResponse } from "next/server";
import { resolveIntegrationBySlug, verifySmsRecipient } from "@/lib/integrations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { value, code } = body as { value?: unknown; code?: unknown };
  if (typeof value !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sms = await resolveIntegrationBySlug("sms");
  if (!sms) {
    return NextResponse.json({ error: "SMS isn't connected yet." }, { status: 404 });
  }

  const verified = await verifySmsRecipient(sms.id, value, code);
  if (!verified) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  return NextResponse.json({ value, verified: true });
}
