import type { Service } from "@/types/service";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import { BarList } from "@/components/BarList";

export default function IncidentCountsChart({
  services,
  counts,
  selectedSlug,
  onSelectService,
}: {
  services: Service[];
  counts: IncidentCountByService[];
  selectedSlug: string;
  onSelectService: (slug: string) => void;
}) {
  const countBySlug = new Map(counts.map((row) => [row.service_slug, row.count]));
  // Built from `services` (already alphabetized by the caller), not from the
  // RPC's own row order, so the count-descending sort below tie-breaks
  // alphabetically and stays stable poll to poll.
  const sorted = services.map((service) => ({ service, count: countBySlug.get(service.slug) ?? 0 })).sort((a, b) => b.count - a.count);

  // Already sorted above (and that sort is what keeps the alphabetical
  // tie-break stable) — BarList gets sortOrder="none" so it doesn't re-sort.
  const data = sorted.map(({ service, count }) => ({ key: service.slug, name: service.name, value: count }));

  return (
    <div>
      <BarList
        data={data}
        sortOrder="none"
        // key is always service.slug — set on every item mapped above
        onValueChange={(item) => onSelectService(item.key!)}
        // bg-info, not bg-primary — this app's primary token is red
        // (matches the status/error color), info is the actual blue
        barColor={(item) => (item.key === selectedSlug ? "bg-info" : "bg-info/50")}
      />
    </div>
  );
}
