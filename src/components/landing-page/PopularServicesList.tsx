"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import "@/lib/i18n/i18n";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { Catalog, ServiceStatusEntry } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";
import { POPULAR_SERVICE_SLUGS } from "@/lib/popularServices";

const POLL_INTERVAL_MS = 60_000;

function PopularServiceRow({ service }: { service: Catalog }) {
  const { data } = useQuery({
    queryKey: queryKeys.quickStatus(service.slug),
    queryFn: () => fetchJson<ServiceStatusEntry>(`/api/status/${service.slug}`),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const style = data && "status" in data ? (INDICATOR_STYLES[data.status.indicator] ?? FALLBACK_STYLE) : FALLBACK_STYLE;
  const statusLabel = data && "status" in data ? data.status.description : undefined;
  const Logo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;

  return (
    <Link
      href={`/services/${service.slug}`}
      className="link link-hover inline-flex items-center gap-1.5"
      title={statusLabel ? `${service.name} — ${statusLabel}` : service.name}
    >
      <Logo size={14} name={service.name} />
      {service.name}
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
    </Link>
  );
}

// The landing footer's curated "Popular Services" column — see
// lib/popularServices.ts for why this is a fixed list rather than
// computed from real tracking data. Shares its catalog fetch (and query
// cache entry) with LandingNavbar's service search, since both just need
// "every known service" — this component filters that down to the
// curated 10. Each row polls its own live status independently, so one
// unreachable host only degrades its own row.
export default function PopularServicesList() {
  const { data: catalog } = useQuery({
    queryKey: queryKeys.catalogAll(),
    queryFn: () => fetchJson<Catalog[]>("/api/catalog"),
  });

  if (!catalog) return null;

  const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
  const popular = POPULAR_SERVICE_SLUGS.map((slug) => bySlug.get(slug)).filter((entry): entry is Catalog => entry !== undefined);

  return (
    <>
      {popular.map((service) => (
        <PopularServiceRow key={service.slug} service={service} />
      ))}
    </>
  );
}
