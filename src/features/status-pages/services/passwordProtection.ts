import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { StatusPageProtection } from "@/features/status-pages/services/statusPages";

// Shared by verifyPassword/verifyUnlockCookie below — a length check plus
// timingSafeEqual, the same constant-time-comparison idiom
// app/api/cron/poll-incidents/route.ts's isAuthorized already uses for
// CRON_SECRET (see AGENTS.md's Security section), consolidated here rather
// than repeated inline twice.
function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

// util.promisify(scryptCallback) resolves to the 3-argument (no options)
// overload's types only, not the 4-argument one this file needs — wrapping
// by hand keeps the options parameter properly typed.
function scrypt(password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

// OWASP-acceptable cost parameters for a low-sensitivity gate (visibility of
// status info, not credentials/payment data) — see
// docs/specs/SPEC-status-page-password.md for why scrypt (Node's built-in,
// no new dependency) was chosen over adding an argon2 dependency.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return constantTimeEqual(actual, expected);
}

// Domain-separated: HMAC the stored password hash with a fixed context
// string to get a purpose-specific subkey, rather than using password_hash
// itself as the signing key directly — cheap key separation between "this
// value verifies a password" and "this value signs a cookie," even though
// both currently derive from the same stored secret. Deriving the key from
// password_hash (rather than a global env secret) means changing or
// removing the password automatically invalidates every cookie signed
// against the old hash — no separate version counter needed.
function deriveUnlockKey(passwordHash: string): Buffer {
  return createHmac("sha256", passwordHash).update("status-page-unlock:v1").digest();
}

export function signUnlockCookie(statusPageId: string, passwordHash: string): string {
  const payload = Buffer.from(JSON.stringify({ statusPageId })).toString("base64url");
  const signature = createHmac("sha256", deriveUnlockKey(passwordHash)).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

// Verifies the cookie was signed against the CURRENT password_hash — a
// cookie signed before the password changed fails here automatically, and
// a malformed/tampered cookie fails without throwing.
export function verifyUnlockCookie(cookieValue: string, statusPageId: string, passwordHash: string): boolean {
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", deriveUnlockKey(passwordHash)).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (!constantTimeEqual(expectedBuf, actualBuf)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as { statusPageId?: unknown };
    return decoded.statusPageId === statusPageId;
  } catch {
    return false;
  }
}

// Whether a status page has either protection mechanism configured at all —
// shared by isStatusPageUnlocked below and by the badge route's
// public-vs-private Cache-Control decision (a page with no protection is
// safe for a shared cache; one with either mechanism on isn't, since the
// same URL can then legitimately differ per visitor).
export function isProtectionConfigured(protection: StatusPageProtection): boolean {
  return protection.passwordHash !== null || protection.allowedIps.length > 0;
}

// The one shared check for all three enforcement surfaces (the page, the
// public JSON API, the embed badge) — pure and synchronous so it's cheap to
// call from all three without threading async plumbing through the badge's
// existing synchronous SVG rendering. Callers resolve `clientIp` (from
// `x-forwarded-for`) and `cookieValue` (from the request's cookies)
// themselves; this function only ever makes the yes/no decision.
export function isStatusPageUnlocked(
  protection: StatusPageProtection,
  context: { clientIp: string | null; cookieValue: string | null },
): boolean {
  if (!isProtectionConfigured(protection)) return true;

  if (context.clientIp !== null && protection.allowedIps.includes(context.clientIp)) return true;

  if (protection.passwordHash !== null && context.cookieValue !== null) {
    return verifyUnlockCookie(context.cookieValue, protection.id, protection.passwordHash);
  }

  return false;
}

// Takes a Headers object rather than a full Request so it works the same
// way from a Route Handler's request.headers and a Server Component's
// next/headers headers() — both are Headers/ReadonlyHeaders instances.
//
// Trusts only the LAST (rightmost) entry in the chain, not the first: each
// hop appends its own observed address to the end of the header, so the
// rightmost entry is the one this app's own trusted edge (Vercel) appended
// itself — the real connecting IP. Everything before it, including the
// first entry, is exactly what the client's own request can set, so
// trusting the first entry would let a visitor spoof their way straight
// past the IP allowlist and the unlock route's rate limit by sending a
// fabricated X-Forwarded-For header.
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const parts = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // The length check guarantees the index is in range — noUncheckedIndexedAccess
  // can't see that from the ternary itself, hence the assertion.
  return parts.length > 0 ? parts[parts.length - 1]! : null;
}

// Route Handlers here type their request param as plain Request (see
// app/api/*'s existing convention), which has no parsed .cookies map —
// this reads the raw Cookie header by hand. Splits only on the first "="
// so a cookie value that itself contains "=" (this file's own
// "<payload>.<signature>" shape can, since base64url payloads sometimes
// don't but the pattern should hold regardless) survives intact.
export function getCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// Namespaced per slug (not one flat cookie name for every status page) so
// unlocking one protected page never touches another's cookie, and so a
// stale cookie from a page that's since been made public/renamed doesn't
// collide with a different page reusing this name.
export function unlockCookieName(slug: string): string {
  return `sp_unlock_${slug}`;
}
