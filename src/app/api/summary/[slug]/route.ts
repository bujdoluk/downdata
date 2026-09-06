import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentsForService, toIncidentApiShape } from "@/lib/getStoredIncident";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/features/maintenance/services/getStoredMaintenance";
import { getServiceUptimeSummary } from "@/lib/uptime";
import { matchesComponentPrefix, stripComponentPrefix } from "@/lib/componentNamePrefix";
import type { Status, Indicator, StatuspageComponent } from "@/types/service";

// Statuspage's own page-level indicator only ever takes these four values
// — "under_maintenance" is a per-component status, never a page-level one
// (matches real Statuspage behavior: a page reads fully "none" overall
// even while one component is flagged under maintenance).
const STATUS_SEVERITY: Record<string, number> = {
  operational: 0,
  under_maintenance: 0,
  degraded_performance: 1,
  partial_outage: 2,
  major_outage: 3,
};
const SEVERITY_TO_INDICATOR: Indicator[] = ["none", "minor", "major", "critical"];
// Plain English, matching the wording Statuspage itself uses for these same
// four indicator levels on every other tracked service's own page — not
// new UI copy, just this app synthesizing what upstream would have said
// had this host's whole page actually been just this service's own.
const SEVERITY_TO_DESCRIPTION = ["All Systems Operational", "Minor Service Outage", "Partial System Outage", "Major Service Outage"];

// A componentNamePrefix means this host's feed covers more than one
// product (see lib/componentNamePrefix.ts) — narrow the live component
// list to just this service's own, strip the now-redundant prefix for
// display, and recompute the overall status from only those components.
// Without this, both would still reflect the whole shared page (e.g. a
// Twilio Voice outage would show as a "SendGrid" outage).
function scopeToOwnComponents(
  data: { components?: StatuspageComponent[]; status: { indicator: Indicator; description: string } },
  prefix: string,
) {
  const components = (data.components ?? []).filter((c) => matchesComponentPrefix(c.name, prefix));
  const displayComponents = components.map((c) => ({ ...c, name: stripComponentPrefix(c.name, prefix) }));
  const worstSeverity = Math.max(0, ...components.map((c) => STATUS_SEVERITY[c.status as Status] ?? 0));

  return {
    ...data,
    components: displayComponents,
    status: {
      indicator: SEVERITY_TO_INDICATOR[worstSeverity] ?? "none",
      description: SEVERITY_TO_DESCRIPTION[worstSeverity] ?? SEVERITY_TO_DESCRIPTION[0],
    },
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  try {
    const res = await fetch(`https://${service.host}/api/v2/summary.json`, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const rawData = await res.json();
    const data = service.componentNamePrefix ? scopeToOwnComponents(rawData, service.componentNamePrefix) : rawData;
    const [incidentRows, maintenanceRows, uptimeSummary] = await Promise.all([
      getStoredIncidentsForService(slug, { limit: 10 }),
      getAllStoredMaintenanceSummaries([slug]),
      getServiceUptimeSummary(slug),
    ]);
    const incidents = incidentRows.map(toIncidentApiShape);
    const maintenances = maintenanceRows.map(toMaintenanceSummaryApiShape);

    return NextResponse.json({
      ...data,
      incidents,
      maintenances,
      ...uptimeSummary,
      service,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach status API" },
      { status: 502 },
    );
  }
}
