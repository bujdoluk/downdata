import { describe, expect, it } from "vitest";
import { sameIds, sameServerValue } from "@/features/monitors/hooks/useServiceComponentFilter";

describe("sameIds", () => {
  it("is false against a null server value (\"All components\" isn't a Custom selection)", () => {
    expect(sameIds(new Set(["a"]), null)).toBe(false);
  });

  it("is true for a set and array with identical members, regardless of order", () => {
    expect(sameIds(new Set(["a", "b"]), ["b", "a"])).toBe(true);
  });

  it("is false when sizes differ", () => {
    expect(sameIds(new Set(["a"]), ["a", "b"])).toBe(false);
  });

  it("is false when sizes match but members differ", () => {
    expect(sameIds(new Set(["a", "b"]), ["a", "c"])).toBe(false);
  });
});

describe("sameServerValue", () => {
  it("is always false against undefined (\"never synced yet\" — the very first sync must always proceed)", () => {
    expect(sameServerValue(null, undefined)).toBe(false);
    expect(sameServerValue(["a"], undefined)).toBe(false);
  });

  it("is true when both sides are null (\"All components\" both times)", () => {
    expect(sameServerValue(null, null)).toBe(true);
  });

  it("is false when only one side is null", () => {
    expect(sameServerValue(null, ["a"])).toBe(false);
    expect(sameServerValue(["a"], null)).toBe(false);
  });

  it("is true for arrays with identical members regardless of order or instance identity", () => {
    expect(sameServerValue(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("is false when array contents genuinely differ", () => {
    expect(sameServerValue(["a", "b"], ["a", "c"])).toBe(false);
  });

  // The actual bug this function exists to fix: a background refetch (e.g.
  // window refocus) hands back a *new array instance* with identical
  // content — must not read as "the server value changed" just because
  // the reference differs.
  it("is true for two different array instances with the same content", () => {
    const a = ["x", "y"];
    const b = ["x", "y"];
    expect(a).not.toBe(b);
    expect(sameServerValue(a, b)).toBe(true);
  });
});
