import { describe, expect, it } from "vitest";
import {
  getClientIp,
  getCookieFromHeader,
  hashPassword,
  isStatusPageUnlocked,
  signUnlockCookie,
  unlockCookieName,
  verifyPassword,
  verifyUnlockCookie,
} from "@/features/status-pages/services/passwordProtection";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("rejects a malformed stored hash without throwing", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
  });

  it("produces a different salt (and hash) for the same password each time", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");
    expect(first).not.toBe(second);
    expect(await verifyPassword("same password", first)).toBe(true);
    expect(await verifyPassword("same password", second)).toBe(true);
  });
});

describe("signUnlockCookie / verifyUnlockCookie", () => {
  it("verifies a cookie signed against the matching password hash", async () => {
    const hash = await hashPassword("the password");
    const cookie = signUnlockCookie("status-page-1", hash);
    expect(verifyUnlockCookie(cookie, "status-page-1", hash)).toBe(true);
  });

  it("rejects a cookie for the wrong status page id", async () => {
    const hash = await hashPassword("the password");
    const cookie = signUnlockCookie("status-page-1", hash);
    expect(verifyUnlockCookie(cookie, "status-page-2", hash)).toBe(false);
  });

  it("rejects a tampered payload", async () => {
    const hash = await hashPassword("the password");
    const cookie = signUnlockCookie("status-page-1", hash);
    const [, signature] = cookie.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ statusPageId: "status-page-2" })).toString("base64url");
    expect(verifyUnlockCookie(`${forgedPayload}.${signature}`, "status-page-2", hash)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const hash = await hashPassword("the password");
    const cookie = signUnlockCookie("status-page-1", hash);
    const [payload] = cookie.split(".");
    expect(verifyUnlockCookie(`${payload}.${"0".repeat(64)}`, "status-page-1", hash)).toBe(false);
  });

  it("rejects a malformed cookie without throwing", () => {
    expect(verifyUnlockCookie("not-a-cookie", "status-page-1", "irrelevant-hash")).toBe(false);
    expect(verifyUnlockCookie("", "status-page-1", "irrelevant-hash")).toBe(false);
  });

  // The core invalidation guarantee this design relies on instead of a
  // separate password_version counter: once the stored hash changes (a
  // password change/removal), every cookie signed against the old hash
  // must stop verifying.
  it("rejects a cookie once the password hash it was signed against changes", async () => {
    const oldHash = await hashPassword("old password");
    const newHash = await hashPassword("new password");
    const cookie = signUnlockCookie("status-page-1", oldHash);
    expect(verifyUnlockCookie(cookie, "status-page-1", oldHash)).toBe(true);
    expect(verifyUnlockCookie(cookie, "status-page-1", newHash)).toBe(false);
  });
});

describe("isStatusPageUnlocked", () => {
  it("is unlocked when neither a password nor an allowlist is configured (today's fully-public behavior)", () => {
    const protection = { id: "status-page-1", passwordHash: null, allowedIps: [] };
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: null })).toBe(true);
  });

  it("is locked when a password is configured and no cookie is presented", async () => {
    const protection = { id: "status-page-1", passwordHash: await hashPassword("secret"), allowedIps: [] };
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: null })).toBe(false);
  });

  it("is unlocked when a password is configured and a valid unlock cookie is presented", async () => {
    const passwordHash = await hashPassword("secret");
    const protection = { id: "status-page-1", passwordHash, allowedIps: [] };
    const cookie = signUnlockCookie("status-page-1", passwordHash);
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: cookie })).toBe(true);
  });

  it("is locked when the presented cookie doesn't verify (wrong page, tampered, or stale password)", async () => {
    const passwordHash = await hashPassword("secret");
    const protection = { id: "status-page-1", passwordHash, allowedIps: [] };
    const cookieForAnotherPage = signUnlockCookie("status-page-2", passwordHash);
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: cookieForAnotherPage })).toBe(false);
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: "garbage" })).toBe(false);
  });

  it("is unlocked when the visitor's IP is on the allowlist, even with no password cookie", () => {
    const protection = { id: "status-page-1", passwordHash: null, allowedIps: ["1.2.3.4"] };
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: null })).toBe(true);
  });

  it("is locked when only an allowlist is configured and the visitor's IP isn't on it", () => {
    const protection = { id: "status-page-1", passwordHash: null, allowedIps: ["9.9.9.9"] };
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: null })).toBe(false);
  });

  it("is unlocked via the allowlist even when a password is also configured and no valid cookie is presented", async () => {
    const protection = { id: "status-page-1", passwordHash: await hashPassword("secret"), allowedIps: ["1.2.3.4"] };
    expect(isStatusPageUnlocked(protection, { clientIp: "1.2.3.4", cookieValue: null })).toBe(true);
  });

  it("is locked when the client IP is unknown (null) and only an allowlist would have admitted it", () => {
    const protection = { id: "status-page-1", passwordHash: null, allowedIps: ["1.2.3.4"] };
    expect(isStatusPageUnlocked(protection, { clientIp: null, cookieValue: null })).toBe(false);
  });
});

describe("getClientIp", () => {
  it("returns null when there's no x-forwarded-for header", () => {
    expect(getClientIp(new Headers())).toBeNull();
  });

  it("returns the first address when there's a single value", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  // The rightmost entry is the one the trusted edge itself appended (the
  // real connecting IP) — everything before it, including the first entry,
  // is exactly what a client can set on its own request, so trusting the
  // first entry (a common mistake) would let a visitor spoof their way
  // past the IP allowlist and the unlock route's rate limit just by
  // sending a fabricated X-Forwarded-For header.
  it("returns only the last (closest-to-this-app) address in a comma-separated chain", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("is not fooled by a spoofed value prepended to the real, edge-appended IP", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "attacker-controlled-value, 203.0.113.7" }))).toBe("203.0.113.7");
  });
});

describe("getCookieFromHeader", () => {
  it("returns null when there's no cookie header", () => {
    expect(getCookieFromHeader(null, "sp_unlock_acme")).toBeNull();
  });

  it("returns null when the named cookie isn't present", () => {
    expect(getCookieFromHeader("other=value", "sp_unlock_acme")).toBeNull();
  });

  it("finds the named cookie among several", () => {
    expect(getCookieFromHeader("a=1; sp_unlock_acme=the-value; b=2", "sp_unlock_acme")).toBe("the-value");
  });

  it("handles a cookie value that itself contains an '=' (base64url payload plus signature)", () => {
    expect(getCookieFromHeader("sp_unlock_acme=payload.sig=nature", "sp_unlock_acme")).toBe("payload.sig=nature");
  });
});

describe("unlockCookieName", () => {
  it("is namespaced per status page slug so different pages' cookies never collide", () => {
    expect(unlockCookieName("acme")).not.toBe(unlockCookieName("other"));
  });
});
