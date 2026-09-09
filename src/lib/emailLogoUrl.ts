// The logo image every transactional email's header embeds (see
// components/emails/EmailLayout.tsx) — deliberately built from APP_URL,
// the app's real public domain, not the current request's own host: an
// email client fetches this image from the recipient's own device, long
// after the request that triggered the send has finished, so it needs a
// stable, internet-reachable URL regardless of what hostname handled that
// request (loopback during local dev/E2E testing included).
export function emailLogoUrl(): string {
  return new URL("/email-logo.png", process.env.APP_URL ?? "https://www.downdata.online").toString();
}
