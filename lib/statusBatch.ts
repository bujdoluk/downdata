import { Temporal } from "temporal-polyfill";
import type { ServiceSlug, ServiceStatusBatchResponse } from "@/types/service";

export async function fetchStatusBatch(
  services: { slug: ServiceSlug; host: string }[],
): Promise<ServiceStatusBatchResponse> {
  const entries = await Promise.all(
    services.map(async (service) => {
      try {
        const [statusRes, incidentsRes] = await Promise.all([
          fetch(`https://${service.host}/api/v2/status.json`, { next: { revalidate: 30 } }),
          fetch(`https://${service.host}/api/v2/incidents.json`, { next: { revalidate: 30 } }),
        ]);

        if (!statusRes.ok) {
          return [service.slug, { error: `Upstream returned ${statusRes.status}` }] as const;
        }

        const statusData = await statusRes.json();

        let outages24h: number | undefined;
        if (incidentsRes.ok) {
          const incidentsData = await incidentsRes.json();
          const cutoff = Temporal.Now.instant().subtract({ hours: 24 });
          outages24h = (incidentsData.incidents as { created_at: string }[]).filter(
            (incident) => Temporal.Instant.compare(Temporal.Instant.from(incident.created_at), cutoff) >= 0,
          ).length;
        }

        return [service.slug, { status: statusData.status, outages24h }] as const;
      } catch {
        return [service.slug, { error: "Failed to reach status API" }] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}
