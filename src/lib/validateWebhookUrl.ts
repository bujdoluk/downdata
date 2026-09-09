import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Guards the one genuinely dangerous part of a generic webhook: this app's
// own server making a POST to a URL a signed-in user supplies. Unlike
// ensureCatalogEntry()'s host check (confirms the response is Statuspage-
// shaped), this has to confirm the *destination* itself is safe to reach
// from the server at all — a user-supplied "webhook" pointed at
// http://169.254.169.254/latest/meta-data or http://localhost:5432 would
// otherwise turn this app's cron notifier into an SSRF proxy into its own
// infrastructure. Deliberately NOT wired into ensureCatalogEntry — that's
// a separate, pre-existing gap, left alone here (see AGENTS.md/PR notes).
//
// Exported standalone so it can run both at add-time (addWebhookTarget)
// and at send-time (notifyIncidentEvents.ts's sendWebhook) — a hostname
// that resolves safely today can be repointed at an internal IP later
// (DNS rebinding), so add-time-only validation isn't enough for something
// that keeps getting POSTed to indefinitely.
export async function validateWebhookUrl(rawUrl: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Webhook URLs must use https://." };
  }

  // A bracketed literal IPv6 hostname (e.g. "[::1]") skips DNS entirely —
  // url.hostname keeps the brackets, isIP doesn't want them.
  const literal = url.hostname.replace(/^\[|\]$/g, "");
  const literalIpVersion = isIP(literal);
  let address: string;
  let family: 4 | 6;
  if (literalIpVersion !== 0) {
    address = literal;
    family = literalIpVersion === 6 ? 6 : 4;
  } else {
    try {
      const resolved = await lookup(url.hostname);
      address = resolved.address;
      family = resolved.family === 6 ? 6 : 4;
    } catch {
      return { ok: false, reason: "That host doesn't resolve." };
    }
  }

  if (isUnsafeAddress(address, family)) {
    return { ok: false, reason: "That URL points at a private or internal address, which isn't allowed." };
  }

  return { ok: true };
}

// IPv4: loopback (127.0.0.0/8), private (10.0.0.0/8, 172.16.0.0/12,
// 192.168.0.0/16), link-local incl. the cloud metadata endpoint
// (169.254.0.0/16), and 0.0.0.0/8.
function isUnsafeIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const first = octets[0] ?? 0;
  const second = octets[1] ?? 0;
  if (first === 127 || first === 10 || first === 0) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 169 && second === 254) return true;
  return false;
}

// IPv6: loopback (::1), unique-local (fc00::/7), link-local (fe80::/10),
// and IPv4-mapped addresses (::ffff:a.b.c.d, dotted or hex form) — many
// dual-stack network stacks route these straight to the embedded IPv4
// host, so ::ffff:127.0.0.1 is exactly as dangerous as 127.0.0.1 itself
// and needs the same IPv4 check, not a separate one. Not exhaustive
// against every obscure encoding (e.g. octal/decimal IPv4 forms) — that
// class of bypass is a real follow-up, not a v1 blocker (see PR notes).
function isUnsafeAddress(address: string, family: 4 | 6): boolean {
  if (family === 4) return isUnsafeIPv4(address);

  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // fe80::/10

  const dottedMapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  // Group 1 isn't optional in the pattern above, so a successful match
  // guarantees it — noUncheckedIndexedAccess can't see that from the regex
  // itself, hence the assertion (same reasoning at both sites below).
  if (dottedMapped) return isUnsafeIPv4(dottedMapped[1]!);

  const hexMapped = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    // Neither group is optional in the pattern above, so a successful
    // match guarantees both.
    const high = parseInt(hexMapped[1]!, 16);
    const low = parseInt(hexMapped[2]!, 16);
    const embeddedIpv4 = [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
    return isUnsafeIPv4(embeddedIpv4);
  }

  return false;
}
