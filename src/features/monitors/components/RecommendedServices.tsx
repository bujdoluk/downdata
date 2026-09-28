"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { Catalog, ServiceStatusEntry } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";

const VISIBLE_COUNT = 6;

function RecommendedServiceCard({ service }: { service: Catalog }) {
  // Not polled: secondary discovery content, not worth a request per card per minute.
  const { data } = useQuery({
    queryKey: queryKeys.quickStatus(service.slug),
    queryFn: () => fetchJson<ServiceStatusEntry>(`/api/status/${service.slug}`),
  });
  const style = data && "status" in data ? (INDICATOR_STYLES[data.status.indicator] ?? FALLBACK_STYLE) : FALLBACK_STYLE;
  const statusLabel = data && "status" in data ? data.status.description : undefined;
  const Logo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;

  return (
    <Link
      href={`/services/${service.slug}`}
      className="card card-border bg-[var(--color-surface-2)] hover:border-base-content/30 transition-colors"
      title={statusLabel ? `${service.name}: ${statusLabel}` : service.name}
    >
      <div className="card-body flex-row items-center gap-2 p-3">
        <Logo size={20} name={service.name} />
        <span className="text-base-content min-w-0 flex-1 truncate text-xs font-medium">{service.name}</span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      </div>
    </Link>
  );
}

export default function RecommendedServices({ currentSlug }: { currentSlug: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: catalog } = useQuery({
    queryKey: queryKeys.catalogAll(),
    queryFn: () => fetchJson<Catalog[]>("/api/catalog"),
  });

  if (!catalog) return null;

  const current = catalog.find((entry) => entry.slug === currentSlug);
  // "other" is a catch-all, not a real category, so it recommends nothing.
  if (!current || current.category === "other") return null;

  const related = catalog.filter((entry) => entry.category === current.category && entry.slug !== currentSlug);
  if (related.length === 0) return null;

  const visible = expanded ? related : related.slice(0, VISIBLE_COUNT);
  const remaining = related.length - VISIBLE_COUNT;

  return (
    <div className="card card-border bg-base-200 md:w-1/2">
      <div className="card-body p-4">
        <h2 className="text-base-content/70 text-xs font-semibold tracking-wide uppercase">{t("serviceDetail.recommendedTitle")}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {visible.map((service) => (
            <RecommendedServiceCard key={service.slug} service={service} />
          ))}
        </div>
        {!expanded && remaining > 0 && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="link link-hover text-base-content/50 hover:text-base-content text-xs"
            >
              {t("serviceDetail.seeMore", { count: remaining })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
