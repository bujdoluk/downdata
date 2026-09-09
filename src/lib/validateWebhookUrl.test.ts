import { describe, expect, it } from "vitest";
import { validateWebhookUrl } from "@/lib/validateWebhookUrl";

// Every case here uses either a literal IP (skips DNS entirely, per the
// function's own bracketed-literal handling) or "localhost" (resolves via
// the OS's local hosts file, no real network needed) — deliberately so this
// suite runs fully offline and deterministically in CI, not dependent on
// any real DNS query succeeding.
describe("validateWebhookUrl", () => {
  it("rejects a malformed URL", async () => {
    expect(await validateWebhookUrl("not a url")).toEqual({ ok: false, reason: "That doesn't look like a valid URL." });
  });

  it("rejects non-https URLs", async () => {
    const result = await validateWebhookUrl("http://8.8.8.8");
    expect(result.ok).toBe(false);
  });

  it("accepts a public IPv4 literal", async () => {
    expect(await validateWebhookUrl("https://8.8.8.8")).toEqual({ ok: true });
  });

  it.each([
    ["loopback", "https://127.0.0.1"],
    ["this-network placeholder", "https://0.0.0.1"],
    ["private 10.0.0.0/8", "https://10.1.2.3"],
    ["private 172.16.0.0/12, low end", "https://172.16.0.1"],
    ["private 172.16.0.0/12, high end", "https://172.31.255.254"],
    ["private 192.168.0.0/16", "https://192.168.1.1"],
    ["link-local / cloud metadata", "https://169.254.169.254"],
  ])("rejects IPv4 %s (%s)", async (_label, url) => {
    const result = await validateWebhookUrl(url);
    expect(result.ok).toBe(false);
  });

  it.each([
    ["just below the 172.16/12 range", "https://172.15.255.255"],
    ["just above the 172.16/12 range", "https://172.32.0.0"],
  ])("does not false-positive on the 172.16/12 boundary: %s (%s)", async (_label, url) => {
    expect(await validateWebhookUrl(url)).toEqual({ ok: true });
  });

  it.each([
    ["loopback ::1", "https://[::1]"],
    ["unique-local fc00::/7 (fc)", "https://[fc00::1]"],
    ["unique-local fc00::/7 (fd)", "https://[fd12::1]"],
    ["link-local fe80::/10", "https://[fe80::1]"],
    // IPv4-mapped IPv6 — many dual-stack stacks route these straight to
    // the embedded IPv4 host, so this needs the same rejection as the
    // plain IPv4 address would get, in both the dotted and hex encodings.
    ["IPv4-mapped loopback, dotted form", "https://[::ffff:127.0.0.1]"],
    ["IPv4-mapped loopback, hex form", "https://[::ffff:7f00:1]"],
    ["IPv4-mapped cloud metadata, dotted form", "https://[::ffff:169.254.169.254]"],
  ])("rejects IPv6 %s (%s)", async (_label, url) => {
    const result = await validateWebhookUrl(url);
    expect(result.ok).toBe(false);
  });

  it("does not false-positive on an IPv4-mapped public address", async () => {
    // 8.8.8.8 mapped into IPv6 form — 0808:0808 hex.
    expect(await validateWebhookUrl("https://[::ffff:808:808]")).toEqual({ ok: true });
  });

  it("accepts a public IPv6 literal", async () => {
    expect(await validateWebhookUrl("https://[2001:4860:4860::8888]")).toEqual({ ok: true });
  });

  it("rejects a hostname that resolves to a loopback address (localhost)", async () => {
    // Exercises the dns.lookup() branch, not just the literal-IP shortcut —
    // localhost resolves via the OS hosts file with no real network query.
    const result = await validateWebhookUrl("https://localhost");
    expect(result.ok).toBe(false);
  });

  it("rejects a hostname that doesn't resolve at all", async () => {
    const result = await validateWebhookUrl("https://this-host-does-not-exist.invalid");
    expect(result.ok).toBe(false);
  });
});
