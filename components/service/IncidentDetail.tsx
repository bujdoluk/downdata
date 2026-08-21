"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { TrackedIncident } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { stripHtml } from "@/lib/stripHtml";

export default function IncidentDetail({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, error } = usePolledFetch<{ incidents: TrackedIncident[] }>("/api/incidents");

  const isLoading = !data && !error;
  const incident = data?.incidents.find((i) => i.id === id);

  const impactStyle = incident ? (INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE) : FALLBACK_STYLE;
  const Logo = incident ? (SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo) : FallbackLogo;

  const backLink = (
    <Link href="/incidents" className="link link-hover text-base-content/50 hover:text-base-content shrink-0 text-xs font-medium">
      {t("serviceDetail.back")}
    </Link>
  );

  return (
    <div className="w-full max-w-6xl self-start">
      {isLoading ? (
        <>
          <div className="mb-6">{backLink}</div>
          <p className="text-base-content/50 text-sm">{t("incidents.loading")}</p>
        </>
      ) : error ? (
        <>
          <div className="mb-6">{backLink}</div>
          <p className="text-base-content/50 text-sm">{t("incidents.unreachable")}</p>
        </>
      ) : !incident ? (
        <>
          <div className="mb-6">{backLink}</div>
          <p className="text-base-content/50 text-sm">{t("incidents.notFound")}</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 text-base-content">
            {backLink}
            <Logo size={36} name={incident.service.name} />
            <div>
              <p className="text-base-content/50 text-xs">{incident.service.name}</p>
              <h1 className="text-xl font-semibold">{incident.name}</h1>
              <p className="text-base-content/40 text-xs">
                {t("incidents.officialPageLabel")}{" "}
                <a href={incident.shortlink} target="_blank" rel="noreferrer" className="link link-hover">
                  {incident.shortlink}
                </a>
              </p>
            </div>
            <span className={`badge ml-auto ${impactStyle.badge} text-white`}>{t(impactStyle.labelKey)}</span>
          </div>

          <ul className="timeline timeline-vertical mt-8 [--timeline-col-start:auto]">
            {incident.incident_updates.map((update, i) => (
              <li key={update.id}>
                {i > 0 && <hr />}
                <div className="timeline-start text-base-content/50 w-36 text-right text-xs whitespace-nowrap">
                  {formatDateTime(update.created_at)}
                </div>
                <div className="timeline-middle">
                  <span className="bg-base-content/30 block h-2 w-2 rounded-full" />
                </div>
                <div className="timeline-end timeline-box bg-base-200">
                  <p className="text-base-content text-sm font-medium">{update.status}</p>
                  <p className="text-base-content/70 mt-1 text-sm whitespace-pre-line">{stripHtml(update.body)}</p>
                </div>
                {i < incident.incident_updates.length - 1 && <hr />}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
