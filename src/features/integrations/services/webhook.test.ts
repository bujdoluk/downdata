import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateWebhookSecret, signWebhookPayload } from "@/features/integrations/services/webhook";

describe("generateWebhookSecret", () => {
  it("returns a 64-character hex string (32 random bytes)", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different secret on every call", () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateWebhookSecret()));
    expect(secrets.size).toBe(20);
  });
});

describe("signWebhookPayload", () => {
  it("matches an independently computed HMAC-SHA256 of the exact same body", () => {
    const secret = "test-secret";
    const rawBody = JSON.stringify({ event: "ping", schemaVersion: 1 });
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    expect(signWebhookPayload(secret, rawBody)).toBe(expected);
  });

  it("is deterministic — same secret and body always produce the same signature", () => {
    const secret = "another-secret";
    const rawBody = '{"a":1}';
    expect(signWebhookPayload(secret, rawBody)).toBe(signWebhookPayload(secret, rawBody));
  });

  it("changes if the body changes (even a single byte)", () => {
    const secret = "same-secret";
    const a = signWebhookPayload(secret, '{"a":1}');
    const b = signWebhookPayload(secret, '{"a":2}');
    expect(a).not.toBe(b);
  });

  it("changes if the secret changes, for the same body", () => {
    const rawBody = '{"a":1}';
    const a = signWebhookPayload("secret-one", rawBody);
    const b = signWebhookPayload("secret-two", rawBody);
    expect(a).not.toBe(b);
  });

  it("returns a 64-character hex digest", () => {
    expect(signWebhookPayload("s", "body")).toMatch(/^[0-9a-f]{64}$/);
  });
});
