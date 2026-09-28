import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { StatusPageProtection } from "@/features/status-pages/services/statusPages";

function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

// Hand-wrapped: util.promisify only types the 3-argument overload, dropping options.
function scrypt(password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

// OWASP-acceptable for a low-sensitivity gate. scrypt over argon2 to avoid a dependency
// (see docs/specs/SPEC-status-page-password.md).
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

// Keyed on password_hash (domain-separated), so changing or removing the password
// invalidates every previously signed cookie.
function deriveUnlockKey(passwordHash: string): Buffer {
  return createHmac("sha256", passwordHash).update("status-page-unlock:v1").digest();
}

export function signUnlockCookie(statusPageId: string, passwordHash: string): string {
  const payload = Buffer.from(JSON.stringify({ statusPageId })).toString("base64url");
  const signature = createHmac("sha256", deriveUnlockKey(passwordHash)).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

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

// Also drives the badge's Cache-Control: a protected page's response differs per visitor.
export function isProtectionConfigured(protection: StatusPageProtection): boolean {
  return protection.passwordHash !== null || protection.allowedIps.length > 0;
}

// Synchronous on purpose so the badge's sync SVG rendering can call it.
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

// Trusts only the rightmost entry (appended by Vercel's edge). Earlier entries are
// client-controlled and would let a visitor spoof past the allowlist and rate limit.
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const parts = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // Safe: the length check guarantees the index is in range.
  return parts.length > 0 ? parts[parts.length - 1]! : null;
}

// Plain Request has no parsed cookies. Splits on the first "=" only so values containing "=" survive.
export function getCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// Per-slug so unlocking one page never touches another's cookie.
export function unlockCookieName(slug: string): string {
  return `sp_unlock_${slug}`;
}
