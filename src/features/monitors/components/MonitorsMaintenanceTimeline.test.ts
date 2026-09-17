import { describe, expect, it } from "vitest";
import { buildMaintenanceEntries, type MaintenanceTimelineEntry } from "@/features/monitors/components/MonitorsMaintenanceTimeline";
import type { Board } from "@/types/board";
import type { TrackedMaintenanceSummary } from "@/types/service";

function maintenance(overrides: Partial<TrackedMaintenanceSummary>): TrackedMaintenanceSummary {
  return {
    id: "maint-1",
    name: "Maintenance",
    status: "in_progress",
    impact: "maintenance",
    created_at: "2024-01-01T00:00:00Z",
    resolved_at: null,
    updated_at: "2024-01-01T00:00:00Z",
    shortlink: "",
    components: [],
    scheduled_for: "2024-06-01T00:00:00Z",
    scheduled_until: "2024-06-01T02:00:00Z",
    service: { slug: "svc", name: "Service", host: "status.example.com" },
    ...overrides,
  };
}

function board(overrides: Partial<Board>): Board {
  return { id: "board-1", name: "Board", Slugs: [], ...overrides };
}

describe("buildMaintenanceEntries", () => {
  it("excludes merely-scheduled maintenance, keeping only in-progress rows", () => {
    const boards = [board({ id: "b1", Slugs: ["a", "b"] })];
    const scheduled = maintenance({ id: "scheduled", status: "scheduled", service: { slug: "a", name: "A", host: "a.example.com" } });
    const inProgress = maintenance({ id: "in-progress", status: "in_progress", service: { slug: "b", name: "B", host: "b.example.com" } });
    const entries = buildMaintenanceEntries(boards, [scheduled, inProgress]);
    expect(entries.map((e: MaintenanceTimelineEntry) => e.maintenance.id)).toEqual(["in-progress"]);
  });

  it("sorts in-progress entries by soonest scheduled_for (earliest-started) first", () => {
    const boards = [board({ id: "b1", Slugs: ["a", "b"] })];
    const startedLater = maintenance({
      id: "started-later",
      scheduled_for: "2024-07-01T00:00:00Z",
      service: { slug: "a", name: "A", host: "a.example.com" },
    });
    const startedSooner = maintenance({
      id: "started-sooner",
      scheduled_for: "2024-06-01T00:00:00Z",
      service: { slug: "b", name: "B", host: "b.example.com" },
    });
    const entries = buildMaintenanceEntries(boards, [startedLater, startedSooner]);
    expect(entries.map((e: MaintenanceTimelineEntry) => e.maintenance.id)).toEqual(["started-sooner", "started-later"]);
  });

  it("sorts globally across boards, not per-board-then-concatenated", () => {
    const boards = [board({ id: "board-a", Slugs: ["a"] }), board({ id: "board-b", Slugs: ["b"] })];
    const startedLaterOnA = maintenance({
      id: "started-later-a",
      scheduled_for: "2024-07-01T00:00:00Z",
      service: { slug: "a", name: "A", host: "a.example.com" },
    });
    const startedSoonerOnB = maintenance({
      id: "started-sooner-b",
      scheduled_for: "2024-06-01T00:00:00Z",
      service: { slug: "b", name: "B", host: "b.example.com" },
    });
    const entries = buildMaintenanceEntries(boards, [startedLaterOnA, startedSoonerOnB]);
    expect(entries.map((e: MaintenanceTimelineEntry) => e.maintenance.id)).toEqual(["started-sooner-b", "started-later-a"]);
  });

  it("dedupes a service tracked on two boards to its first matching board, with no duplicate entries", () => {
    const boards = [board({ id: "board-1", Slugs: ["shared"] }), board({ id: "board-2", Slugs: ["shared"] })];
    const m = maintenance({ id: "maint-shared", service: { slug: "shared", name: "Shared", host: "shared.example.com" } });
    const entries = buildMaintenanceEntries(boards, [m]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.boardId).toBe("board-1");
  });
});
