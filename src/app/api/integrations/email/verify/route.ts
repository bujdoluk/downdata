import { NextResponse } from "next/server";
import { verifyEmailRecipient } from "@/lib/integrations";

// Public — see proxy.ts's PUBLIC_EXACT entry for why: this is clicked
// from an email client, not this app, so the browser completing it may
// have no session at all. Redirects into the (session-gated) /integrations
// page either way — a logged-out click just bounces through /login first,
// same as any other protected link.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const verified = token ? await verifyEmailRecipient(token) : false;
  return NextResponse.redirect(new URL(`/integrations?verified=${verified ? "1" : "0"}`, request.url));
}
