import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// SSRF guard for user-supplied webhook URLs (blocks internal/metadata addresses).
// Runs at add-time and send-time, since DNS can be repointed later (rebinding).
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

  // url.hostname keeps IPv6 brackets, isIP rejects them.
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

// IPv4-mapped IPv6 routes to the embedded IPv4 host, so it gets the IPv4 check.
// Not exhaustive against octal/decimal IPv4 encodings (known follow-up).
function isUnsafeAddress(address: string, family: 4 | 6): boolean {
  if (family === 4) return isUnsafeIPv4(address);

  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // fe80::/10

  const dottedMapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  // Non-optional regex group, guaranteed on match.
  if (dottedMapped) return isUnsafeIPv4(dottedMapped[1]!);

  const hexMapped = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    // Non-optional regex groups, guaranteed on match.
    const high = parseInt(hexMapped[1]!, 16);
    const low = parseInt(hexMapped[2]!, 16);
    const embeddedIpv4 = [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
    return isUnsafeIPv4(embeddedIpv4);
  }

  return false;
}
