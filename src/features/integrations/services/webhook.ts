import { createHmac, randomBytes } from "node:crypto";
import { validateWebhookUrl } from "@/lib/validateWebhookUrl";
import { nowIso } from "@/lib/formatTime";

// Per target, not per account, so one leaked secret can't compromise other webhooks.
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

// Same scheme as Stripe/GitHub, so receivers can verify with a standard recipe.
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
      // A redirect to an internal address would bypass the SSRF check on the original URL.
      redirect: "manual",
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Re-validates on every send to catch DNS rebinding since add-time (not fully closed:
// fetch resolves DNS separately). validationCache is per cron cycle, to avoid repeat lookups.
export async function sendWebhook(url: string, secret: string, body: unknown, validationCache?: Map<string, boolean>): Promise<boolean> {
  let isValid = validationCache?.get(url);
  if (isValid === undefined) {
    isValid = (await validateWebhookUrl(url)).ok;
    validationCache?.set(url, isValid);
  }
  if (!isValid) return false;
  return postSigned(url, secret, body);
}

// Synchronous verification at save time: a machine endpoint can't click a confirmation link.
export async function sendWebhookPing(url: string, secret: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const validation = await validateWebhookUrl(url);
  if (!validation.ok) return validation;

  const delivered = await postSigned(url, secret, { event: "ping", schemaVersion: 1, timestamp: nowIso() });
  if (!delivered) return { ok: false, reason: "We couldn't reach that URL. Check that it's correct and accepts POST requests." };
  return { ok: true };
}
