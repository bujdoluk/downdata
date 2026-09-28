import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentsForService, toIncidentApiShape } from "@/lib/getStoredIncident";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/features/maintenance/services/getStoredMaintenance";
import { getServiceUptimeSummary } from "@/lib/uptime";
import { matchesComponentPrefix, stripComponentPrefix } from "@/lib/componentNamePrefix";
import { INDICATOR_RANK } from "@/components/statusStyles";
import type { Status, Indicator, StatuspageComponent, OpenIncidentImpact } from "@/types/service";

// under_maintenance counts as operational: Statuspage never raises the page indicator for it.
const STATUS_SEVERITY: Record<string, number> = {
  operational: 0,
  under_maintenance: 0,
  degraded_performance: 1,
  partial_outage: 2,
  major_outage: 3,
};
const SEVERITY_TO_INDICATOR: Indicator[] = ["none", "minor", "major", "critical"];
// Statuspage's own wording for these levels, not new UI copy, so it isn't translated.
const SEVERITY_TO_DESCRIPTION = ["All Systems Operational", "Minor Service Outage", "Partial System Outage", "Major Service Outage"];

// A shared multi-product feed (lib/componentNamePrefix.ts): without scoping, e.g. a Twilio Voice
// outage would show as a SendGrid outage.
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

// Only surfaced when worse than the rollup; the rollup itself is never overridden (see OpenIncidentImpact).
function worstOpenIncidentImpact(
  incidents: { resolved_at: string | null; impact: string; name: string; shortlink: string | null }[],
  rollupIndicator: Indicator,
): OpenIncidentImpact | undefined {
  const rollupRank = INDICATOR_RANK[rollupIndicator] ?? 0;
  let worst: OpenIncidentImpact | undefined;
  for (const incident of incidents) {
    if (incident.resolved_at !== null) continue;
    const rank = INDICATOR_RANK[incident.impact] ?? 0;
    if (rank > rollupRank && (!worst || rank > (INDICATOR_RANK[worst.impact] ?? 0))) {
      worst = { impact: incident.impact, name: incident.name, shortlink: incident.shortlink ?? "" };
    }
  }
  return worst;
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
    const openIncidentImpact = worstOpenIncidentImpact(incidentRows, data.status.indicator);

    return NextResponse.json({
      ...data,
      incidents,
      maintenances,
      ...uptimeSummary,
      service,
      ...(openIncidentImpact ? { openIncidentImpact } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach status API" },
      { status: 502 },
    );
  }
}
