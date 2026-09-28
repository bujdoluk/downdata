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
  // Built from the alphabetized `services` so count ties break stably.
  const sorted = services.map((service) => ({ service, count: countBySlug.get(service.slug) ?? 0 })).sort((a, b) => b.count - a.count);

  const data = sorted.map(({ service, count }) => ({ key: service.slug, name: service.name, value: count }));

  return (
    <div>
      <BarList
        data={data}
        sortOrder="none"
        // key is always set to service.slug in the mapping above
        onValueChange={(item) => onSelectService(item.key!)}
        // bg-info, not bg-primary: primary is red here.
        barColor={(item) => (item.key === selectedSlug ? "bg-info" : "bg-info/50")}
      />
    </div>
  );
}
