import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceDefinition } from "@/types/service";
import type { IncidentCountByService } from "@/lib/getStoredIncident";

const BAR_HEIGHT_PX = 96;

export default function IncidentCountsChart({
  services,
  counts,
  selectedSlug,
  onSelectService,
}: {
  services: ServiceDefinition[];
  counts: IncidentCountByService[];
  selectedSlug: string;
  onSelectService: (slug: string) => void;
}) {
  const { t } = useTranslation();

  const countBySlug = new Map(counts.map((row) => [row.service_slug, row.count]));
  // Built from `services` (already alphabetized by the caller), not from the
  // RPC's own row order, so the count-descending sort below tie-breaks
  // alphabetically and stays stable poll to poll.
  const bars = services
    .map((service) => ({ service, count: countBySlug.get(service.slug) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(0, ...bars.map((bar) => bar.count));

  return (
    <div className="card card-border bg-base-200 mt-4 p-4">
      <p className="text-base-content/60 text-sm font-medium">{t("history.overview.title")}</p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {bars.map(({ service, count }) => (
          <button
            key={service.slug}
            type="button"
            onClick={() => onSelectService(service.slug)}
            className="tooltip flex w-16 shrink-0 flex-col items-center gap-1"
            style={{ height: BAR_HEIGHT_PX }}
          >
            <div className="tooltip-content">{t("history.overview.incidentCount", { count })}</div>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-sm ${service.slug === selectedSlug ? "bg-primary" : "bg-primary/50"}`}
                style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : 0 }}
              />
            </div>
            <span className="text-base-content/70 w-full truncate text-center text-xs">{service.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
