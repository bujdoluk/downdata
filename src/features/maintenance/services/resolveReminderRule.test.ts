import { describe, expect, it } from "vitest";
import { resolveRuleForService } from "@/features/maintenance/services/resolveReminderRule";
import type { MaintenanceReminderRule } from "@/features/maintenance/types";

function rule(overrides: Partial<MaintenanceReminderRule>): MaintenanceReminderRule {
  return { id: "rule-1", serviceSlug: null, minutesBefore: 240, channels: ["slack"], ...overrides };
}

describe("resolveRuleForService", () => {
  it("returns null when no rule covers the service", () => {
    expect(resolveRuleForService([], "github")).toBeNull();
  });

  it("returns the account's 'all' rule when no per-service rule exists", () => {
    const allRule = rule({ id: "all-rule", serviceSlug: null });
    expect(resolveRuleForService([allRule], "github")).toBe(allRule);
  });

  it("returns a per-service rule when it's the only one", () => {
    const githubRule = rule({ id: "github-rule", serviceSlug: "github" });
    expect(resolveRuleForService([githubRule], "github")).toBe(githubRule);
  });

  it("prefers a per-service rule over the account's 'all' rule for that same service", () => {
    const allRule = rule({ id: "all-rule", serviceSlug: null, minutesBefore: 240 });
    const githubRule = rule({ id: "github-rule", serviceSlug: "github", minutesBefore: 60 });
    expect(resolveRuleForService([allRule, githubRule], "github")).toBe(githubRule);
    // Order in the array shouldn't matter.
    expect(resolveRuleForService([githubRule, allRule], "github")).toBe(githubRule);
  });

  it("falls back to the 'all' rule for a service with no rule of its own, even when another service has one", () => {
    const allRule = rule({ id: "all-rule", serviceSlug: null });
    const githubRule = rule({ id: "github-rule", serviceSlug: "github" });
    expect(resolveRuleForService([allRule, githubRule], "cloudflare")).toBe(allRule);
  });
});
