"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import CatalogServiceCard from "@/components/service/CatalogServiceCard";

const mono = "font-mono";

const demoRows = [
  { slug: "supabase", name: "Supabase", indicator: "minor", outages24h: 1 },
  { slug: "github", name: "GitHub", indicator: "none", outages24h: 0 },
  { slug: "cloudflare", name: "Cloudflare", indicator: "none", outages24h: 0 },
] as const;

export default function LiveDashboardPanel({ className = "" }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <div className="bg-info/10 absolute inset-0 translate-x-3 translate-y-3 rounded-2xl" aria-hidden="true" />
      <div className="card card-border bg-base-200 relative shadow-2xl">
        <div className="card-body gap-3 p-6">
          <div className="flex items-center justify-between px-1">
            <span className={`text-base-content/50 text-[0.7rem] tracking-[0.1em] uppercase ${mono}`}>
              {t("landing.hero.liveDashboard")}
            </span>
            <span className="flex gap-1.5">
              <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
              <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
              <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
            </span>
          </div>
          <div className="text-success flex items-center gap-2 px-1 pb-1 text-xs">
            <span className="bg-success animate-signal-pulse h-[7px] w-[7px] rounded-full" />
            {t("landing.hero.eyebrow")}
          </div>
          {demoRows.map((row) => (
            <CatalogServiceCard
              key={row.slug}
              slug={row.slug}
              name={row.name}
              indicator={row.indicator}
              outages24h={row.outages24h}
              isLoading={false}
              error={false}
              isMonitored={false}
              removable={{ removing: false, onRemove: () => {} }}
              onTogglePin={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
