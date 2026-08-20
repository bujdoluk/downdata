import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addIntegration } from "@/lib/integrations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("slack_oauth_state")?.value;
  cookieStore.delete("slack_oauth_state");

  const redirectToIntegrations = (query: string) => NextResponse.redirect(new URL(`/integrations${query}`, request.url));

  if (!code || !state || state !== cookieState) {
    return redirectToIntegrations("?error=1");
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToIntegrations("?error=1");
  }

  const redirectUri = new URL("/api/integrations/slack/callback", request.url).toString();

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await tokenRes.json();
    const webhookUrl = data?.incoming_webhook?.url;

    if (!data.ok || typeof webhookUrl !== "string" || !webhookUrl.startsWith("https://hooks.slack.com/services/")) {
      return redirectToIntegrations("?error=1");
    }

    addIntegration({ slug: "slack", name: "Slack", webhookUrl });

    // Best-effort — Slack's own OAuth response already proves the connection
    // works, so a failed test message shouldn't block saving it.
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "downDATA is now connected to this channel." }),
      signal: AbortSignal.timeout(8_000),
    }).catch(() => {});
  } catch {
    return redirectToIntegrations("?error=1");
  }

  return redirectToIntegrations("");
}
