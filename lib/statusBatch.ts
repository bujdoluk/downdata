import { Temporal } from "temporal-polyfill";
import { getSupabaseClient } from "@/lib/supabase";
import type { ServiceSlug, ServiceStatusBatchResponse } from "@/types/service";

// One batched DB read instead of N live incidents.json fetches — the
// catalog poller already stores every one of these hosts' incidents, so
// there's no need to hit each host's API a second time just to count
// recent ones. status.json (the current indicator) still has no DB table
// backing it and stays a live per-host fetch below.
async function fetchOutagesLast24h(slugs: ServiceSlug[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};
  const supabase = getSupabaseClient();
  const cutoff = Temporal.Now.instant().subtract({ hours: 24 }).toString();
  const { data } = await supabase.from("incidents").select("service_slug").in("service_slug", slugs).gte("created_at", cutoff);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.service_slug] = (counts[row.service_slug] ?? 0) + 1;
  return counts;
}

export async function fetchStatusBatch(
  services: { slug: ServiceSlug; host: string }[],
): Promise<ServiceStatusBatchResponse> {
  const outagesBySlug = await fetchOutagesLast24h(services.map((service) => service.slug));

  const entries = await Promise.all(
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

  return Object.fromEntries(entries);
}
