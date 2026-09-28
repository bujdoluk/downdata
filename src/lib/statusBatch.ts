import { Temporal } from "temporal-polyfill";
import { getSupabaseClient } from "@/lib/supabase";
import { OUTAGE_IMPACTS } from "@/lib/uptime";
import { INDICATOR_RANK } from "@/components/statusStyles";
import type { Slug, ServiceStatusBatchResponse, OpenIncidentImpact } from "@/types/service";

// Reads the poller's stored incidents instead of N live incidents.json fetches.
async function fetchOutagesLast24h(slugs: Slug[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};
  const supabase = getSupabaseClient();
  const cutoff = Temporal.Now.instant().subtract({ hours: 24 }).toString();
  // Must match uptime.ts's OUTAGE_IMPACTS so the count agrees with the detail page.
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

// Only services whose open incident outranks the live rollup get an entry, so presence means "flag it".
async function fetchOpenIncidentImpacts(
  services: { slug: Slug; host: string }[],
  rollupIndicators: Record<string, string>,
): Promise<Record<string, OpenIncidentImpact>> {
  const slugs = services.map((service) => service.slug);
  if (slugs.length === 0) return {};
  const supabase = getSupabaseClient();
  // Same "still open" definition as migration 0029.
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
