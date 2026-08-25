import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Service } from "@/types/service";
import type { IncidentCountByService } from "@/lib/getStoredIncident";

// A "quick overview" stops being one past a screenful of rows — cap to the
// worst offenders instead of forcing a long scroll through everyone.
const MAX_BARS = 20;

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
  const { t } = useTranslation();

  const countBySlug = new Map(counts.map((row) => [row.service_slug, row.count]));
  // Built from `services` (already alphabetized by the caller), not from the
  // RPC's own row order, so the count-descending sort below tie-breaks
  // alphabetically and stays stable poll to poll.
  const sorted = services.map((service) => ({ service, count: countBySlug.get(service.slug) ?? 0 })).sort((a, b) => b.count - a.count);
  const bars = sorted.slice(0, MAX_BARS);
  const hiddenCount = sorted.length - bars.length;
  const maxCount = Math.max(0, ...bars.map((bar) => bar.count));

  return (
    <div className="card card-border bg-base-200 p-4">
      <p className="text-base-content/60 text-sm font-medium">
        {hiddenCount > 0 ? t("history.overview.titleTop", { max: MAX_BARS }) : t("history.overview.title")}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {bars.map(({ service, count }) => (
          <li key={service.slug}>
            <button
              type="button"
              onClick={() => onSelectService(service.slug)}
              className="flex w-full items-center gap-2"
            >
              <span className="text-base-content/70 w-24 shrink-0 truncate text-right text-xs">{service.name}</span>
              <span className="bg-base-content/10 h-4 flex-1 rounded-sm">
                <span
                  className={`block h-full rounded-sm ${service.slug === selectedSlug ? "bg-primary" : "bg-primary/50"}`}
                  style={{ width: maxCount > 0 ? `${(count / maxCount) * 100}%` : 0 }}
                />
              </span>
              <span className="text-base-content/70 w-6 shrink-0 text-left text-xs tabular-nums">{count}</span>
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && <p className="text-base-content/40 mt-2 text-xs">{t("history.overview.moreServices", { count: hiddenCount })}</p>}
    </div>
  );
}
