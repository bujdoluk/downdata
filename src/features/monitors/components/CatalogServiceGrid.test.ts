import { describe, expect, it } from "vitest";
import { hasAlertIcon, sortCatalog } from "@/features/monitors/components/CatalogServiceGrid";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";

function entry(overrides: Partial<Catalog>): Catalog {
  return { slug: "svc", name: "Service", host: "status.example.com", category: "infrastructure", ...overrides };
}

describe("hasAlertIcon", () => {
  it("is false when the entry has no status data", () => {
    expect(hasAlertIcon(entry({ slug: "a" }), null)).toBe(false);
  });

  it("is false when openIncidentImpact isn't set", () => {
    const data: ServiceStatusBatchResponse = { a: { status: { indicator: "none", description: "" } } };
    expect(hasAlertIcon(entry({ slug: "a" }), data)).toBe(false);
  });

  it("is true when openIncidentImpact is set", () => {
    const data: ServiceStatusBatchResponse = {
      a: {
        status: { indicator: "none", description: "" },
        openIncidentImpact: { impact: "critical", name: "Outage", shortlink: "" },
      },
    };
    expect(hasAlertIcon(entry({ slug: "a" }), data)).toBe(true);
  });
});

describe("sortCatalog", () => {
  it("sorts by rollup severity descending, unaffected by sortAlertsToTop", () => {
    const a = entry({ slug: "a", name: "A" });
    const b = entry({ slug: "b", name: "B" });
    const data: ServiceStatusBatchResponse = {
      a: { status: { indicator: "minor", description: "" } },
      b: { status: { indicator: "critical", description: "" } },
    };
    expect(sortCatalog([a, b], data, false).map((e) => e.slug)).toEqual(["b", "a"]);
    expect(sortCatalog([a, b], data, true).map((e) => e.slug)).toEqual(["b", "a"]);
  });

  it("when sortAlertsToTop is true, breaks a severity tie in favor of the entry with the alert icon", () => {
    const a = entry({ slug: "a", name: "A" });
    const b = entry({ slug: "b", name: "B" });
    const data: ServiceStatusBatchResponse = {
      a: { status: { indicator: "none", description: "" } },
      b: {
        status: { indicator: "none", description: "" },
        openIncidentImpact: { impact: "critical", name: "Outage", shortlink: "" },
      },
    };
    expect(sortCatalog([a, b], data, true).map((e) => e.slug)).toEqual(["b", "a"]);
  });

  it("when sortAlertsToTop is false, the alert icon never affects order", () => {
    const a = entry({ slug: "a", name: "A" });
    const b = entry({ slug: "b", name: "B" });
    const data: ServiceStatusBatchResponse = {
      a: { status: { indicator: "none", description: "" } },
      b: {
        status: { indicator: "none", description: "" },
        openIncidentImpact: { impact: "critical", name: "Outage", shortlink: "" },
      },
    };
    expect(sortCatalog([a, b], data, false).map((e) => e.slug)).toEqual(["a", "b"]);
  });

  it("never lets the alert icon override a real severity difference", () => {
    const a = entry({ slug: "a", name: "A" });
    const b = entry({ slug: "b", name: "B" });
    const data: ServiceStatusBatchResponse = {
      // a has the higher rollup severity but no alert icon; b has a lower
      // rollup severity but does have the alert icon — a must still sort first.
      a: { status: { indicator: "major", description: "" } },
      b: {
        status: { indicator: "minor", description: "" },
        openIncidentImpact: { impact: "critical", name: "Outage", shortlink: "" },
      },
    };
    expect(sortCatalog([a, b], data, true).map((e) => e.slug)).toEqual(["a", "b"]);
  });
});
