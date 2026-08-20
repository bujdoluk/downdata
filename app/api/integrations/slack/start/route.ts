import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Slack integration isn't configured." }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/integrations/slack/callback", request.url).toString();

  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  // chat:write creates a real bot user (visible in the picked channel and
  // in Slack's app list) alongside the incoming-webhook we already post
  // through — we still deliver messages via the webhook URL, not this bot
  // token, so nothing downstream needs to change.
  authorizeUrl.searchParams.set("scope", "incoming-webhook,chat:write");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
