"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Service, TrackedIncidentSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { formatDateTime } from "@/lib/formatTime";

export default function BoardLastIncidentTable({
  entries,
}: {
  entries: { service: Service; lastIncident: TrackedIncidentSummary | null }[];
}) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("boards.lastIncident.title")}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {entries.map(({ service, lastIncident }) => {
          const Logo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;
          return (
            <li key={service.slug} className="card card-border bg-base-200 flex flex-row items-center gap-3 p-3">
              <Logo size={20} name={service.name} />
              <p className="text-base-content min-w-0 flex-1 truncate text-sm font-medium">{service.name}</p>
              {lastIncident ? (
                <p className="text-base-content/50 min-w-0 shrink truncate text-xs">
                  {lastIncident.name} · {formatDateTime(lastIncident.resolved_at ?? lastIncident.updated_at)}
                </p>
              ) : (
                <p className="text-base-content/40 shrink-0 text-xs">{t("boards.lastIncident.none")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
