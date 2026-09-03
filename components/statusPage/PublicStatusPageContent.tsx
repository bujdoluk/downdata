"use client";

import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useTimeZone } from "@/hooks/useTimeZone";
import type { PublicStatusPage } from "@/types/statusPage";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import OutageTracker from "@/components/service/OutageTracker";
import StatusSummary from "@/components/service/StatusSummary";
import Logo from "@/components/navbar/Logo";
import { InfoIcon } from "@/components/icons/NavIcons";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

const POLL_INTERVAL_MS = 60_000;

// The public, unauthenticated view of a board's status page — mirrors
// BoardDetailContent's status summary and ServiceDetail's per-service
// tracker/uptime block, but built from GET /api/public/status/[slug]
// instead of the caller's own boards.
export default function PublicStatusPageContent({ slug, initialData }: { slug: string; initialData: PublicStatusPage }) {
  const { t } = useTranslation();
  const timeZone = useTimeZone();

  const { data } = useQuery({
    queryKey: queryKeys.publicStatusPage(slug),
    queryFn: () => fetchJson<PublicStatusPage>(`/api/public/status/${slug}`),
    initialData,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const overviewCounts = { critical: 0, major: 0, minor: 0, none: 0 };
  for (const service of data.services) {
    const indicator = service.indicator;
    if (indicator === "critical" || indicator === "major" || indicator === "minor" || indicator === "none") {
      overviewCounts[indicator]++;
    }
  }

  return (
    <div className="w-full max-w-3xl self-start">
      <div className="flex items-center gap-3">
        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
          <img src={data.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
        ) : (
          !data.hideBranding && <Logo className="h-8 w-8 shrink-0" />
        )}
        <h1 className="text-base-content truncate text-2xl font-bold">{data.companyName}</h1>
      </div>

      <div className="mt-1">
        <StatusSummary counts={overviewCounts} isLoading={false} />
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {data.services.map((service) => {
          const ServiceLogo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;
          const style = service.indicator ? (INDICATOR_STYLES[service.indicator] ?? FALLBACK_STYLE) : FALLBACK_STYLE;
          return (
            <li key={service.slug} className="card card-border bg-base-200 p-4">
              <div className="flex items-center gap-2.5">
                <ServiceLogo size={20} name={service.name} />
                <p className="text-base-content min-w-0 flex-1 truncate text-sm font-medium">{service.name}</p>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                <p className={`text-xs font-medium whitespace-nowrap ${style.text}`}>{t(style.labelKey)}</p>
              </div>

              <div className="mt-3">
                <OutageTracker incidents={service.last30DaysIncidents} timeZone={timeZone} trackedSince={service.trackedSince} />
              </div>

              <div className="text-base-content/50 mt-2 flex justify-end text-xs">
                <span className="inline-flex items-center gap-1">
                  <Trans
                    i18nKey="serviceDetail.uptime30d"
                    values={{ value: service.official30daysUptime, days: service.uptimeWindowDays }}
                    components={[<span key="0" className="text-base-content text-sm font-bold" />]}
                  />
                  <span className="tooltip tooltip-left" data-tip={t("serviceDetail.uptime30dMethodology")}>
                    <InfoIcon className="text-base-content/40" />
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
