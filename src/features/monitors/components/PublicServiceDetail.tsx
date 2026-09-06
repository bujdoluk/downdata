"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatMonthYear } from "@/lib/formatTime";
import type { Slug, ServiceSummaryResponse } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import OutageTracker from "@/features/monitors/components/OutageTracker";
import { InfoIcon } from "@/components/icons/NavIcons";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useTimeZone } from "@/hooks/useTimeZone";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

// The public, unauthenticated view of one service — same data source
// (queryKeys.serviceStatus/api/summary/[slug]) and header/uptime/outage
// blocks as features/monitors/components/ServiceDetail.tsx, but only the
// fields that make sense with no session: no per-account Notifications
// tab, no links into behind-login pages (/monitors, /history). A separate
// component rather than an `isPublic` flag on ServiceDetail — same split
// this repo already uses for status pages (BoardStatusPageSettings vs.
// the separate PublicStatusPageContent).
export default function PublicServiceDetail({ slug }: { slug: Slug }) {
  const { t } = useTranslation();
  const timeZone = useTimeZone();
  const { data, isError: error } = useQuery({
    queryKey: queryKeys.serviceStatus(slug),
    queryFn: () => fetchJson<ServiceSummaryResponse>(`/api/summary/${slug}`, { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const isLoading = !data && !error;
  const overallStyle = INDICATOR_STYLES[data?.status.indicator ?? "unknown"] ?? FALLBACK_STYLE;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;

  return (
    <div className="mx-auto w-full max-w-2xl self-start">
      <Link href="/landing-page" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
        {t("serviceDetail.back")}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4 text-base-content">
        <div className="flex items-center gap-3">
          <Logo size={36} name={data?.service.name ?? slug} />
          <div>
            <h1 className="text-xl font-semibold">{data?.service.name ?? slug}</h1>
            {data?.service.host && (
              <a
                href={`https://${data.service.host}`}
                target="_blank"
                rel="noreferrer"
                className="link link-hover text-base-content/50 hover:text-base-content text-xs"
              >
                {data.service.host}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isLoading ? (
            <Spinner size="xs" className="text-base-content/40" />
          ) : (
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${error ? "bg-base-content/20" : overallStyle.dot}`} />
          )}
          <p className={`text-sm font-medium whitespace-nowrap ${error || isLoading ? "text-base-content/50" : overallStyle.text}`}>
            {isLoading
              ? t("serviceDetail.checkingStatus")
              : error
                ? t("serviceDetail.unreachable")
                : data?.status.description}
          </p>
        </div>
      </div>

      {data && data.trackedSince && (
        <div className="text-base-content/50 mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <p className="text-base-content/40 text-xs">
            {t("serviceDetail.trackedSince", { date: formatMonthYear(data.trackedSince, timeZone) })}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-right">
            <span className="inline-flex items-center gap-1">
              <Trans
                i18nKey="serviceDetail.uptime30d"
                values={{ value: data.official30daysUptime, days: data.uptimeWindowDays }}
                components={[<span key="0" className="text-base-content text-base font-bold" />]}
              />
              <span className="tooltip" data-tip={t("serviceDetail.uptime30dMethodology")}>
                <InfoIcon className="text-base-content/40" />
              </span>
            </span>
            {data.officialAllTimeUptime !== null && (
              <span className="inline-flex items-center gap-1">
                <Trans
                  i18nKey="serviceDetail.uptimeAllTime"
                  values={{ value: data.officialAllTimeUptime }}
                  components={[<span key="0" className="text-base-content text-base font-bold" />]}
                />
                <span className="tooltip" data-tip={t("serviceDetail.uptimeMethodology")}>
                  <InfoIcon className="text-base-content/40" />
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {data && (
        <div className="mt-4">
          <OutageTracker incidents={data.last30DaysIncidents} timeZone={timeZone} trackedSince={data.trackedSince} />
        </div>
      )}
    </div>
  );
}
