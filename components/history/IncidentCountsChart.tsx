import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Service } from "@/types/service";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import { getNiceTicks } from "@/lib/niceTicks";
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
  const { t } = useTranslation();

  const countBySlug = new Map(counts.map((row) => [row.service_slug, row.count]));
  // Built from `services` (already alphabetized by the caller), not from the
  // RPC's own row order, so the count-descending sort below tie-breaks
  // alphabetically and stays stable poll to poll.
  const sorted = services.map((service) => ({ service, count: countBySlug.get(service.slug) ?? 0 })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(0, ...sorted.map((bar) => bar.count));

  // Already sorted above (and that sort is what keeps the alphabetical
  // tie-break stable) — BarList gets sortOrder="none" so it doesn't re-sort.
  const data = sorted.map(({ service, count }) => ({ key: service.slug, name: service.name, value: count }));

  return (
    <div className="card card-border bg-base-200 p-4">
      <p className="text-base-content/60 text-sm font-medium">{t("history.overview.title")}</p>

      <div className="mt-3">
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

      {maxCount > 0 && (
        <div className="mt-1.5 flex items-center gap-6" aria-hidden="true">
          <div className="border-base-content/10 relative h-4 w-full border-t">
            {getNiceTicks(maxCount).map((tick, i, ticks) => (
              <span
                key={tick}
                className={`absolute top-0 flex flex-col items-center ${
                  i === 0 ? "left-0" : i === ticks.length - 1 ? "left-full -translate-x-full" : "-translate-x-1/2"
                }`}
                style={i === 0 || i === ticks.length - 1 ? undefined : { left: `${(tick / maxCount) * 100}%` }}
              >
                <span className="bg-base-content/15 h-1.5 w-px" />
                <span className="text-base-content/40 text-[10px] tabular-nums">{tick}</span>
              </span>
            ))}
          </div>
          {/* Invisible but same markup as BarList's own value column so this
              spacer's width matches it exactly (digit count of maxCount is
              always >= every other shown count's digit count) — keeps the
              axis under the bar track, not under the value column too. */}
          <div className="invisible flex items-center">
            <p className="text-sm leading-none tabular-nums">{maxCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}
