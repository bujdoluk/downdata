import { createHmac, randomBytes } from "node:crypto";
import { validateWebhookUrl } from "@/lib/validateWebhookUrl";
import { nowIso } from "@/lib/formatTime";

// One secret per target URL, not one shared secret for the whole account —
// leaking one receiver's secret shouldn't compromise every other webhook
// this account has configured. 32 random bytes, hex-encoded (64 chars) —
// plenty of entropy for an HMAC key, and a plain string this app's own
// column (and the user's copy-paste) can hold without any encoding fuss.
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

// HMAC-SHA256 over the raw JSON body, hex-encoded — same primitive/shape
// Stripe and GitHub both use for their own outgoing webhook signatures, so
// verifying it on the receiving end is a well-documented, one-line recipe
// in virtually any language ("hmac-sha256(secret, rawBody) == header").
export function signWebhookPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

async function postSigned(url: string, secret: string, body: unknown): Promise<boolean> {
  const rawBody = JSON.stringify(body);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Signature": signWebhookPayload(secret, rawBody) },
      body: rawBody,
      signal: AbortSignal.timeout(8_000),
      // Without this, fetch follows redirects automatically — a target
      // that passes validateWebhookUrl honestly (a real public host) could
      // still 302 the actual POST to an internal address, bypassing the
      // whole SSRF check, which only ever validates the original URL. A
      // manual redirect comes back as an opaque-redirect response
      // (status 0, ok: false), so no extra handling is needed beyond this.
      redirect: "manual",
    });
    return res.ok;
  } catch {
    return false;
  }
}

// The real send path (notifyIncidentEvents.ts) — re-validates the URL on
// every call, not just once at add-time, since a hostname that resolved
// safely when the target was added can be repointed at an internal address
// later (DNS rebinding across sends). One extra DNS lookup per send is
// cheap next to the fetch itself, and this is the one channel where
// skipping it would leave a standing SSRF hole in something explicitly
// meant to be production-ready. Honest limit, not fully closed: this
// lookup and fetch()'s own internal resolution are two separate DNS
// queries a few milliseconds apart, not one pinned address reused for
// both — a rebinding server timed to answer differently between those two
// specific queries could still slip through. Closing that fully means
// resolving once and forcing fetch to connect to that exact IP (a custom
// dispatcher), not done here.
//
// validationCache is optional and caller-owned (notifyIncidentEvents.ts
// creates one per notifyPendingEvents() cycle, the same "resolve once per
// cycle" idea resolveEventCached already applies to incident lookups) — a
// backlog of pending events to the same target would otherwise re-run this
// DNS lookup once per event in the same cron tick, the same shape of
// per-cycle I/O multiplication that already saturated this project's
// Postgres/compute once before (see AGENTS.md's Failure log). Still safe
// against rebinding *across* cycles, since a fresh cache is created every
// call — only re-sends within the same cycle share a lookup.
export async function sendWebhook(url: string, secret: string, body: unknown, validationCache?: Map<string, boolean>): Promise<boolean> {
  let isValid = validationCache?.get(url);
  if (isValid === undefined) {
    isValid = (await validateWebhookUrl(url)).ok;
    validationCache?.set(url, isValid);
  }
  if (!isValid) return false;
  return postSigned(url, secret, body);
}

// Gates adding a target in the first place — a synchronous check at save
// time, not an async "click a link later" flow like email/sms (there's no
// human on the other end to do that for a machine endpoint). A failed ping
// means the row is never inserted; addWebhookTarget's caller (the API
// route) surfaces this reason directly to the user.
export async function sendWebhookPing(url: string, secret: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const validation = await validateWebhookUrl(url);
  if (!validation.ok) return validation;

  const delivered = await postSigned(url, secret, { event: "ping", schemaVersion: 1, timestamp: nowIso() });
  if (!delivered) return { ok: false, reason: "We couldn't reach that URL. Check that it's correct and accepts POST requests." };
  return { ok: true };
}
