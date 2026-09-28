import { NextResponse } from "next/server";
import { verifyEmailRecipient } from "@/features/integrations/services/integrations";

// Public: clicked from an email client that may have no session. The token is the authorization.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const verified = token ? await verifyEmailRecipient(token) : false;
  return NextResponse.redirect(new URL(`/integrations?verified=${verified ? "1" : "0"}`, request.url));
}
