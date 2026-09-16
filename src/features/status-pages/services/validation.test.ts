import { describe, expect, it } from "vitest";
import {
  allowedIpsSchema,
  companyNameSchema,
  firstAllowedIpsIssueMessage,
  firstIssueMessage,
  MAX_ALLOWED_IPS,
  passwordSchema,
  slugSchema,
} from "@/features/status-pages/services/validation";

describe("slugSchema", () => {
  it("accepts a plain lowercase-hyphenated slug", () => {
    expect(slugSchema.safeParse("acme-status").success).toBe(true);
  });

  it("trims and lowercases", () => {
    expect(slugSchema.parse("  ACME-Status  ")).toBe("acme-status");
  });

  it("rejects fewer than 3 characters", () => {
    const result = slugSchema.safeParse("ab");
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe("Your status page URL needs at least 3 characters.");
  });

  it("rejects more than 100 characters", () => {
    const result = slugSchema.safeParse("a".repeat(101));
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe("Your status page URL can be at most 100 characters.");
  });

  it("accepts exactly 100 characters", () => {
    expect(slugSchema.safeParse("a".repeat(100)).success).toBe(true);
  });

  it("rejects a leading hyphen", () => {
    expect(slugSchema.safeParse("-acme").success).toBe(false);
  });

  it("rejects a trailing hyphen", () => {
    expect(slugSchema.safeParse("acme-").success).toBe(false);
  });

  it("rejects doubled hyphens", () => {
    expect(slugSchema.safeParse("acme--status").success).toBe(false);
  });

  it("rejects spaces and symbols", () => {
    const result = slugSchema.safeParse("acme status!");
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toMatch(/lowercase letters, numbers, and hyphens/);
  });
});

describe("companyNameSchema", () => {
  it("accepts an empty string (company name is optional)", () => {
    expect(companyNameSchema.safeParse("").success).toBe(true);
  });

  it("rejects more than 120 characters", () => {
    const result = companyNameSchema.safeParse("a".repeat(121));
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe("Company name can be at most 120 characters.");
  });

  it("accepts exactly 120 characters", () => {
    expect(companyNameSchema.safeParse("a".repeat(120)).success).toBe(true);
  });
});

describe("passwordSchema", () => {
  it("rejects fewer than 8 characters", () => {
    const result = passwordSchema.safeParse("abcdefg");
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe("Password must be at least 8 characters.");
  });

  it("accepts exactly 8 characters", () => {
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(true);
  });

  it("rejects more than 64 characters", () => {
    const result = passwordSchema.safeParse("a".repeat(65));
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe("Password must be at most 64 characters.");
  });

  it("accepts exactly 64 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(64)).success).toBe(true);
  });
});

describe("allowedIpsSchema", () => {
  it("accepts a mix of valid IPv4 and IPv6 addresses", () => {
    expect(allowedIpsSchema.safeParse(["203.0.113.5", "2001:db8::1"]).success).toBe(true);
  });

  it("accepts an empty list (clearing the allowlist)", () => {
    expect(allowedIpsSchema.safeParse([]).success).toBe(true);
  });

  it("rejects an invalid address", () => {
    expect(allowedIpsSchema.safeParse(["not-an-ip"]).success).toBe(false);
  });

  it("rejects a CIDR range", () => {
    expect(allowedIpsSchema.safeParse(["203.0.113.0/24"]).success).toBe(false);
  });

  it(`rejects more than ${MAX_ALLOWED_IPS} entries`, () => {
    const result = allowedIpsSchema.safeParse(Array.from({ length: MAX_ALLOWED_IPS + 1 }, (_, i) => `10.0.0.${i}`));
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe(`You can add at most ${MAX_ALLOWED_IPS} IP addresses. Remove some before saving.`);
  });

  it(`accepts exactly ${MAX_ALLOWED_IPS} entries`, () => {
    expect(allowedIpsSchema.safeParse(Array.from({ length: MAX_ALLOWED_IPS }, (_, i) => `10.0.0.${i}`)).success).toBe(true);
  });
});

describe("firstIssueMessage", () => {
  it("returns null on success", () => {
    expect(firstIssueMessage(slugSchema.safeParse("acme"))).toBeNull();
  });
});

describe("firstAllowedIpsIssueMessage", () => {
  it("returns null on success", () => {
    expect(firstAllowedIpsIssueMessage(allowedIpsSchema.safeParse(["1.1.1.1"]), ["1.1.1.1"])).toBeNull();
  });

  it("names the specific offending entry, not just 'something is wrong'", () => {
    const entries = ["203.0.113.5", "definitely-not-an-ip", "2001:db8::1"];
    const result = allowedIpsSchema.safeParse(entries);
    expect(firstAllowedIpsIssueMessage(result, entries)).toBe(
      '"definitely-not-an-ip" isn\'t a valid IP address. Enter a single IPv4 or IPv6 address. IP ranges (CIDR, like 1.2.3.0/24) aren\'t supported yet.',
    );
  });

  it("falls back to the array-level message when the failure isn't about one entry", () => {
    const entries = Array.from({ length: MAX_ALLOWED_IPS + 1 }, (_, i) => `10.0.0.${i}`);
    const result = allowedIpsSchema.safeParse(entries);
    expect(firstAllowedIpsIssueMessage(result, entries)).toBe(`You can add at most ${MAX_ALLOWED_IPS} IP addresses. Remove some before saving.`);
  });

  it("truncates a very long offending entry instead of echoing it back in full", () => {
    const garbage = "d".repeat(500);
    const entries = [garbage];
    const result = allowedIpsSchema.safeParse(entries);
    const message = firstAllowedIpsIssueMessage(result, entries);
    expect(message).toBe(`"${"d".repeat(80)}…" isn't a valid IP address. ${"Enter a single IPv4 or IPv6 address. IP ranges (CIDR, like 1.2.3.0/24) aren't supported yet."}`);
    expect(message?.length).toBeLessThan(garbage.length);
  });

  it("shows a moderately long typo in full, not truncated", () => {
    const entries = ["not-an-ip-but-under-eighty-characters-long-so-it-should-show-completely"];
    const result = allowedIpsSchema.safeParse(entries);
    expect(firstAllowedIpsIssueMessage(result, entries)).toContain(entries[0]);
  });
});
