"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatTime } from "@/lib/formatTime";
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
      <Link href="/" className="link link-hover text-base-content/50 hover:text-base-content mb-6 inline-block text-xs font-medium">
        ← Back
      </Link>

      <div className="flex items-center gap-3 text-base-content">
        <Logo size={36} name={data?.service.name ?? slug} />
        <div>
          <h1 className="text-xl font-semibold">{data?.service.name ?? slug}</h1>
          <p className="text-base-content/50 text-xs">{data?.service.host}</p>
        </div>
      </div>

      <div className="card card-border bg-base-200 mt-4">
        <div className="card-body flex-row items-center gap-2.5 p-3">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isLoading || error ? "bg-base-content/20" : overallStyle.dot
            } ${isLoading ? "animate-pulse" : ""}`}
          />
          <p className={`text-sm font-medium ${error || isLoading ? "text-base-content/50" : overallStyle.text}`}>
            {isLoading
              ? "Checking status…"
              : error
                ? "Unable to reach status API"
                : data?.status.description}
          </p>
        </div>
      </div>

      {data && (
        <>
          <h2 className="text-base-content/40 mt-8 mb-3 text-xs font-semibold tracking-wide uppercase">
            Components
          </h2>
          <ul className="list bg-base-200 border-base-300 border">
            {components.map((c) => {
              const s = COMPONENT_STATUS_STYLES[c.status] ?? FALLBACK_STYLE;
              return (
                <li key={c.id} className="list-row items-center py-2.5">
                  <span className="text-base-content text-sm">{c.name}</span>
                  <span className={`badge badge-soft ${s.badge}`}>{s.label}</span>
                </li>
              );
            })}
          </ul>

          <h2 className="text-base-content/40 mt-8 mb-3 text-xs font-semibold tracking-wide uppercase">
            Incidents
          </h2>
          {data.incidents.length === 0 ? (
            <p className="text-base-content/50 text-sm">No incidents reported.</p>
          ) : (
            <ul className="list bg-base-200 border-base-300 border">
              {data.incidents.map((incident) => (
                <li key={incident.id} className="list-row py-2.5">
                  <div>
                    <a
                      href={incident.shortlink}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-hover text-base-content text-sm"
                    >
                      {incident.name}
                    </a>
                    <p className="text-base-content/50 mt-0.5 text-xs">
                      {incident.status} · updated{" "}
                      {formatDateTime(incident.updated_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-base-content/30 mt-6 text-[11px]">
            Last updated {formatTime(data.page.updated_at)}
          </p>
        </>
      )}
    </div>
  );
}
