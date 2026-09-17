import { describe, expect, it } from "vitest";
import { eventComponentIds, passesComponentFilter } from "@/lib/notifyIncidentEvents";
import type { ResolvedEvent } from "@/lib/notifyIncidentEvents";
import type { StoredIncident, StoredIncidentUpdate } from "@/lib/getStoredIncident";

const BASE_INCIDENT: StoredIncident = {
  service_slug: "cloudflare",
  id: "inc-1",
  name: "Elevated errors",
  status: "investigating",
  impact: "major",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  monitoring_at: null,
  resolved_at: null,
  shortlink: null,
  components: null,
  incident_updates: [],
};

const BASE_UPDATE: StoredIncidentUpdate = {
  service_slug: "cloudflare",
  incident_id: "inc-1",
  id: "upd-1",
  status: "investigating",
  body: "Investigating.",
  affected_components: null,
  created_at: "2026-01-01T00:05:00.000Z",
  updated_at: "2026-01-01T00:05:00.000Z",
  display_at: null,
  deliver_notifications: true,
  custom_tweet: null,
  tweet_id: null,
};

const USER_ID = "user-1";

function cacheWith(key: string, allowlist: Set<string> | null): Map<string, Promise<Set<string> | null>> {
  return new Map([[key, Promise.resolve(allowlist)]]);
}

describe("eventComponentIds", () => {
  it("reads incident.components (by id) for incident_created", () => {
    const resolved: ResolvedEvent = {
      type: "incident_created",
      incident: { ...BASE_INCIDENT, components: [{ id: "api", name: "API", status: "major_outage" }] },
    };
    expect(eventComponentIds(resolved)).toEqual(["api"]);
  });

  it("reads update.affected_components (by code, not id) for update_added", () => {
    const resolved: ResolvedEvent = {
      type: "update_added",
      incident: BASE_INCIDENT,
      update: { ...BASE_UPDATE, affected_components: [{ code: "api", name: "API", new_status: "major_outage", old_status: "operational" }] },
    };
    expect(eventComponentIds(resolved)).toEqual(["api"]);
  });

  it("returns an empty array when nothing is attached", () => {
    expect(eventComponentIds({ type: "incident_created", incident: BASE_INCIDENT })).toEqual([]);
  });
});

describe("passesComponentFilter", () => {
  it("always passes when the event names no components, even with an active allowlist", async () => {
    const resolved: ResolvedEvent = { type: "incident_created", incident: BASE_INCIDENT };
    const cache = cacheWith("user-1:cloudflare", new Set(["api"]));
    expect(await passesComponentFilter(USER_ID, "cloudflare", resolved, cache)).toBe(true);
  });

  it("passes when there's no filter row at all (\"All components\")", async () => {
    const resolved: ResolvedEvent = {
      type: "incident_created",
      incident: { ...BASE_INCIDENT, components: [{ id: "dns", name: "DNS", status: "major_outage" }] },
    };
    const cache = cacheWith("user-1:cloudflare", null);
    expect(await passesComponentFilter(USER_ID, "cloudflare", resolved, cache)).toBe(true);
  });

  it("passes when the event's components intersect the allowlist", async () => {
    const resolved: ResolvedEvent = {
      type: "incident_created",
      incident: { ...BASE_INCIDENT, components: [{ id: "dns", name: "DNS", status: "operational" }, { id: "api", name: "API", status: "major_outage" }] },
    };
    const cache = cacheWith("user-1:cloudflare", new Set(["api"]));
    expect(await passesComponentFilter(USER_ID, "cloudflare", resolved, cache)).toBe(true);
  });

  it("fails when the event's components don't intersect the allowlist", async () => {
    const resolved: ResolvedEvent = {
      type: "incident_created",
      incident: { ...BASE_INCIDENT, components: [{ id: "dns", name: "DNS", status: "major_outage" }] },
    };
    const cache = cacheWith("user-1:cloudflare", new Set(["api"]));
    expect(await passesComponentFilter(USER_ID, "cloudflare", resolved, cache)).toBe(false);
  });

  it("uses the update's own affected_components, not the incident's top-level components, for update_added", async () => {
    const resolved: ResolvedEvent = {
      type: "update_added",
      // Incident's own components deliberately differ from the update's —
      // if this read the wrong field, it would pass on "dns" instead of
      // failing on "api" (the allowlist has neither).
      incident: { ...BASE_INCIDENT, components: [{ id: "dns", name: "DNS", status: "operational" }] },
      update: { ...BASE_UPDATE, affected_components: [{ code: "api", name: "API", new_status: "major_outage", old_status: "operational" }] },
    };
    const cache = cacheWith("user-1:cloudflare", new Set(["dns"]));
    expect(await passesComponentFilter(USER_ID, "cloudflare", resolved, cache)).toBe(false);
  });
});
