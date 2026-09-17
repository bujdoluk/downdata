import { describe, expect, it } from "vitest";
import {
  buildTimelineEntries,
  isAlertIncident,
  sortIncidentsBySeverity,
  type TimelineEntry,
} from "@/features/monitors/components/MonitorsActiveIncidentsTimeline";
import type { Board } from "@/types/board";
import type { ServiceStatusBatchResponse, TrackedIncidentSummary } from "@/types/service";

function incident(overrides: Partial<TrackedIncidentSummary>): TrackedIncidentSummary {
  return {
    id: "inc-1",
    name: "Incident",
    status: "investigating",
    impact: "minor",
    created_at: "2024-01-01T00:00:00Z",
    resolved_at: null,
    updated_at: "2024-01-01T00:00:00Z",
    shortlink: "",
    components: [],
    service: { slug: "svc", name: "Service", host: "status.example.com" },
    ...overrides,
  };
}

function board(overrides: Partial<Board>): Board {
  return { id: "board-1", name: "Board", Slugs: [], ...overrides };
}

describe("isAlertIncident", () => {
  it("is false when the service has no entry in data", () => {
    const inc = incident({ impact: "critical", service: { slug: "a", name: "A", host: "a.example.com" } });
    expect(isAlertIncident(inc, undefined)).toBe(false);
    const data: ServiceStatusBatchResponse = {};
    expect(isAlertIncident(inc, data)).toBe(false);
  });

  it("is false when the service's entry has no status (an error entry)", () => {
    const inc = incident({ impact: "critical", service: { slug: "a", name: "A", host: "a.example.com" } });
    const data: ServiceStatusBatchResponse = { a: { error: "unreachable" } };
    expect(isAlertIncident(inc, data)).toBe(false);
  });

  it("is true when the incident's own impact exceeds the rollup indicator", () => {
    const inc = incident({ impact: "critical", service: { slug: "a", name: "A", host: "a.example.com" } });
    const data: ServiceStatusBatchResponse = { a: { status: { indicator: "minor", description: "" } } };
    expect(isAlertIncident(inc, data)).toBe(true);
  });

  it("is false when the incident's own impact doesn't exceed the rollup indicator", () => {
    const inc = incident({ impact: "minor", service: { slug: "a", name: "A", host: "a.example.com" } });
    const data: ServiceStatusBatchResponse = { a: { status: { indicator: "critical", description: "" } } };
    expect(isAlertIncident(inc, data)).toBe(false);
  });
});

describe("sortIncidentsBySeverity", () => {
  it("sorts by the incident's own impact rank, descending — most severe first", () => {
    const a = incident({ id: "a", impact: "minor", service: { slug: "a", name: "A", host: "a.example.com" } });
    const b = incident({ id: "b", impact: "critical", service: { slug: "b", name: "B", host: "b.example.com" } });
    expect(sortIncidentsBySeverity([a, b], undefined).map((i: TrackedIncidentSummary) => i.id)).toEqual(["b", "a"]);
    // Order in the input array shouldn't matter.
    expect(sortIncidentsBySeverity([b, a], undefined).map((i: TrackedIncidentSummary) => i.id)).toEqual(["b", "a"]);
  });

  it("breaks a severity tie in favor of the alert-tier incident", () => {
    const a = incident({ id: "a", impact: "minor", service: { slug: "a", name: "A", host: "a.example.com" } });
    const b = incident({ id: "b", impact: "minor", service: { slug: "b", name: "B", host: "b.example.com" } });
    const data: ServiceStatusBatchResponse = {
      a: { status: { indicator: "minor", description: "" } },
      b: { status: { indicator: "none", description: "" } },
    };
    expect(sortIncidentsBySeverity([a, b], data).map((i: TrackedIncidentSummary) => i.id)).toEqual(["b", "a"]);
  });
});

describe("buildTimelineEntries", () => {
  it("only includes active incidents (investigating/identified/monitoring)", () => {
    const boards = [board({ id: "b1", Slugs: ["a"] })];
    const active = incident({ id: "active", status: "monitoring", service: { slug: "a", name: "A", host: "a.example.com" } });
    const resolved = incident({ id: "resolved", status: "resolved", service: { slug: "a", name: "A", host: "a.example.com" } });
    const entries = buildTimelineEntries(boards, [active, resolved], undefined);
    expect(entries.map((e: TimelineEntry) => e.incident.id)).toEqual(["active"]);
  });

  it("sorts globally by severity across every board, critical first — a board's own low-severity incident never outranks a different board's critical one just because it comes first in `boards` order", () => {
    const boards = [board({ id: "board-a", Slugs: ["a"] }), board({ id: "board-b", Slugs: ["b"] })];
    const minorOnA = incident({ id: "minor-a", impact: "minor", service: { slug: "a", name: "A", host: "a.example.com" } });
    const criticalOnB = incident({ id: "critical-b", impact: "critical", service: { slug: "b", name: "B", host: "b.example.com" } });
    const entries = buildTimelineEntries(boards, [minorOnA, criticalOnB], undefined);
    expect(entries.map((e: TimelineEntry) => e.incident.id)).toEqual(["critical-b", "minor-a"]);
    expect(entries.map((e: TimelineEntry) => e.boardId)).toEqual(["board-b", "board-a"]);
  });

  it("dedupes a service tracked on two boards to its first matching board, with no duplicate entries", () => {
    const boards = [board({ id: "board-1", Slugs: ["shared"] }), board({ id: "board-2", Slugs: ["shared"] })];
    const inc = incident({ id: "inc-shared", service: { slug: "shared", name: "Shared", host: "shared.example.com" } });
    const entries = buildTimelineEntries(boards, [inc], undefined);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.boardId).toBe("board-1");
  });

  it("excludes incidents whose own impact is \"maintenance\" (some providers use it as their own lowest-severity tier, e.g. Catchpoint's per-node blips)", () => {
    const boards = [board({ id: "b1", Slugs: ["a"] })];
    const maintenanceTier = incident({ id: "maintenance-tier", impact: "maintenance", service: { slug: "a", name: "A", host: "a.example.com" } });
    const real = incident({ id: "real", impact: "minor", service: { slug: "a", name: "A", host: "a.example.com" } });
    const entries = buildTimelineEntries(boards, [maintenanceTier, real], undefined);
    expect(entries.map((e: TimelineEntry) => e.incident.id)).toEqual(["real"]);
  });
});
