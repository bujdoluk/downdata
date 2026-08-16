"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ServiceDefinition, ServiceSlug } from "@/lib/services";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import {
  INDICATOR_STYLES,
  COMPONENT_STATUS_STYLES,
  FALLBACK_STYLE,
  type Indicator,
  type ComponentStatus,
} from "@/components/service/statusStyles";

type Component = {
  id: string;
  name: string;
  status: ComponentStatus;
  position: number;
  group_id: string | null;
  showcase: boolean;
};

type Incident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  updated_at: string;
  shortlink: string;
};

type SummaryResponse = {
  service: ServiceDefinition;
  page: {
    updated_at: string;
  };
  status: {
    indicator: Indicator;
    description: string;
  };
  components: Component[];
  incidents: Incident[];
};

const POLL_INTERVAL_MS = 30_000;

export default function ServiceDetail({ slug }: { slug: ServiceSlug }) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/summary/${slug}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as SummaryResponse;
        if (!cancelled) {
          setData(json);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [slug]);

  const isLoading = !data && !error;
  const overallStyle = INDICATOR_STYLES[data?.status.indicator ?? "unknown"] ?? FALLBACK_STYLE;
  const components = (data?.components ?? [])
    .filter((c) => c.group_id === null && c.showcase)
    .sort((a, b) => a.position - b.position);

  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;

  return (
    <div className="w-full max-w-lg">
      <Link
        href="/"
        className="mb-6 inline-block text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white"
      >
        ← Back
      </Link>

      <div className="flex items-center gap-3 text-neutral-900 dark:text-white">
        <Logo size={36} name={data?.service.name ?? slug} />
        <div>
          <h1 className="text-xl font-semibold">{data?.service.name ?? slug}</h1>
          <p className="text-xs text-neutral-500 dark:text-white/50">
            {data?.service.host}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isLoading ? "animate-pulse bg-black/20 dark:bg-white/30" : error ? "bg-black/20 dark:bg-white/30" : overallStyle.dot
          }`}
        />
        <p className={`text-sm font-medium ${error || isLoading ? "text-neutral-500 dark:text-white/50" : overallStyle.text}`}>
          {isLoading
            ? "Checking status…"
            : error
              ? "Unable to reach status API"
              : data?.status.description}
        </p>
      </div>

      {data && (
        <>
          <h2 className="mt-8 mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-white/40">
            Components
          </h2>
          <ul className="divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
            {components.map((c) => {
              const s = COMPONENT_STATUS_STYLES[c.status] ?? FALLBACK_STYLE;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="text-sm text-neutral-900 dark:text-white">{c.name}</span>
                  <span className={`flex items-center gap-2 text-xs font-medium ${s.text}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-8 mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-white/40">
            Incidents
          </h2>
          {data.incidents.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-white/50">
              No incidents reported.
            </p>
          ) : (
            <ul className="divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
              {data.incidents.map((incident) => (
                <li key={incident.id} className="px-3 py-2.5">
                  <a
                    href={incident.shortlink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-neutral-900 underline-offset-2 hover:underline dark:text-white"
                  >
                    {incident.name}
                  </a>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-white/50">
                    {incident.status} · updated{" "}
                    {new Date(incident.updated_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-[11px] text-neutral-400 dark:text-white/30">
            Last updated {new Date(data.page.updated_at).toLocaleTimeString()}
          </p>
        </>
      )}
    </div>
  );
}
