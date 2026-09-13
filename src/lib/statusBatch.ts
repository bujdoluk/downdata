import { Temporal } from "temporal-polyfill";
import { getSupabaseClient } from "@/lib/supabase";
import { OUTAGE_IMPACTS } from "@/lib/uptime";
import { INDICATOR_RANK } from "@/components/statusStyles";
import type { Slug, ServiceStatusBatchResponse, OpenIncidentImpact } from "@/types/service";

// One batched DB read instead of N live incidents.json fetches — the
// catalog poller already stores every one of these hosts' incidents, so
// there's no need to hit each host's API a second time just to count
// recent ones. status.json (the current indicator) still has no DB table
// backing it and stays a live per-host fetch below.
async function fetchOutagesLast24h(slugs: Slug[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};
  const supabase = getSupabaseClient();
  const cutoff = Temporal.Now.instant().subtract({ hours: 24 }).toString();
  // Only major/critical count as an "official" outage — matches uptime.ts's
  // OUTAGE_IMPACTS, so this count agrees with what the service's own detail
  // page reports as downtime (a minor incident isn't an "outage").
  const { data } = await supabase
    .from("incidents")
    .select("service_slug")
    .in("service_slug", slugs)
    .in("impact", Array.from(OUTAGE_IMPACTS))
    .gte("created_at", cutoff);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.service_slug] = (counts[row.service_slug] ?? 0) + 1;
  return counts;
}

// The worst currently-open incident per service, only for services whose
// open incident outranks their own live rollup indicator — a service with
// no open incident, or one no worse than the rollup already says, gets no
// entry at all, so callers can treat presence in this map as "there's
// something worth flagging" without re-deriving the comparison themselves.
async function fetchOpenIncidentImpacts(
  services: { slug: Slug; host: string }[],
  rollupIndicators: Record<string, string>,
): Promise<Record<string, OpenIncidentImpact>> {
  const slugs = services.map((service) => service.slug);
  if (slugs.length === 0) return {};
  const supabase = getSupabaseClient();
  // resolved_at is null — the same "still open" definition
  // 0029_fix_get_uptime_stats_open_incident_null.sql already uses.
  const { data } = await supabase
    .from("incidents")
    .select("service_slug, impact, name, shortlink")
    .in("service_slug", slugs)
    .is("resolved_at", null);

  const worstBySlug: Record<string, OpenIncidentImpact> = {};
  for (const row of data ?? []) {
    const current = worstBySlug[row.service_slug];
    if (!current || (INDICATOR_RANK[row.impact] ?? 0) > (INDICATOR_RANK[current.impact] ?? 0)) {
      worstBySlug[row.service_slug] = { impact: row.impact, name: row.name, shortlink: row.shortlink ?? "" };
    }
  }

  const result: Record<string, OpenIncidentImpact> = {};
  for (const [slug, worst] of Object.entries(worstBySlug)) {
    const rollupRank = INDICATOR_RANK[rollupIndicators[slug] ?? "none"] ?? 0;
    if ((INDICATOR_RANK[worst.impact] ?? 0) > rollupRank) result[slug] = worst;
  }
  return result;
}

export async function fetchStatusBatch(
  services: { slug: Slug; host: string }[],
): Promise<ServiceStatusBatchResponse> {
  const outagesBySlug = await fetchOutagesLast24h(services.map((service) => service.slug));

  const statusResults = await Promise.all(
    services.map(async (service) => {
      try {
        const statusRes = await fetch(`https://${service.host}/api/v2/status.json`, { next: { revalidate: 60 } });
        if (!statusRes.ok) {
          return [service.slug, { error: `Upstream returned ${statusRes.status}` }] as const;
        }

        const statusData = await statusRes.json();
        return [service.slug, { status: statusData.status, outages24h: outagesBySlug[service.slug] }] as const;
      } catch {
        return [service.slug, { error: "Failed to reach status API" }] as const;
      }
    }),
  );

  const rollupIndicators: Record<string, string> = {};
  for (const [slug, entry] of statusResults) {
    if ("status" in entry) rollupIndicators[slug] = entry.status.indicator;
  }
  const openIncidentImpacts = await fetchOpenIncidentImpacts(services, rollupIndicators);

  const entries = statusResults.map(([slug, entry]) => {
    if ("error" in entry) return [slug, entry] as const;
    const openIncidentImpact = openIncidentImpacts[slug];
    return [slug, openIncidentImpact ? { ...entry, openIncidentImpact } : entry] as const;
  });

  return Object.fromEntries(entries);
}
