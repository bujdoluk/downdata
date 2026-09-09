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
  // Fetched once, not polled — this is a discovery sidebar for *other*
  // services, not the page's own subject; a visitor who clicks through
  // gets fresh data on that service's own page anyway, so a recurring
  // 60s poll per card here would just be extra request volume for
  // secondary content.
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
      title={statusLabel ? `${service.name} — ${statusLabel}` : service.name}
    >
      <div className="card-body flex-row items-center gap-2 p-3">
        <Logo size={20} name={service.name} />
        <span className="text-base-content min-w-0 flex-1 truncate text-xs font-medium">{service.name}</span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      </div>
    </Link>
  );
}

// The public service detail page's "you may also want to track" sidebar —
// a single column of small cards, one per other catalog entry in the same
// category as the current service, capped at VISIBLE_COUNT with a "see
// more" expansion for the rest. Sized to md:w-1/2 of its own reserved
// slot in PublicServiceDetail.tsx (itself 25% of the screen) so the card
// stays the same width it was as a 2-column grid cell, rather than
// stretching to fill the whole slot and leaving the rest of this sidebar
// area looking like unfinished layout.
//
// Resolves the current entry's own category itself (rather than the
// caller threading it through from /api/summary/[slug]'s data) so this
// stays self-contained: just needs which service it's next to. Shares
// its catalog fetch (and query cache entry) with the landing navbar's
// search and the footer's Popular Services list — all three just need
// "every known service".
export default function RecommendedServices({ currentSlug }: { currentSlug: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: catalog } = useQuery({
    queryKey: queryKeys.catalogAll(),
    queryFn: () => fetchJson<Catalog[]>("/api/catalog"),
  });

  if (!catalog) return null;

  const current = catalog.find((entry) => entry.slug === currentSlug);
  // "other" is a catch-all, not a real shared category — grouping by it
  // would produce an arbitrary, meaningless list under a "you may also
  // want to track" heading, so treat it the same as "no matches" below.
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
