"use client";

import { useEffect, useState } from "react";
import type { ServiceDefinition, ServiceSlug } from "@/lib/services";
import ServiceCard from "@/components/service/ServiceCard";
import type { Indicator } from "@/components/service/statusStyles";

type StatusEntry =
  | { status: { indicator: Indicator; description: string }; outages24h?: number }
  | { error: string };

type BatchResponse = Partial<Record<ServiceSlug, StatusEntry>>;

const POLL_INTERVAL_MS = 30_000;

export default function ServiceGrid({ services }: { services: ServiceDefinition[] }) {
  const [data, setData] = useState<BatchResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as BatchResponse;
        if (!cancelled) {
          setData(json);
          setFetchFailed(false);
        }
      } catch {
        if (!cancelled) setFetchFailed(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      {services.map((service) => {
        const entry = data?.[service.slug];
        const entryFailed = fetchFailed || (entry ? "error" in entry : false);
        return (
          <ServiceCard
            key={service.slug}
            slug={service.slug}
            name={service.name}
            isLoading={!data && !fetchFailed}
            error={entryFailed}
            indicator={entry && "status" in entry ? entry.status.indicator : undefined}
            description={entry && "status" in entry ? entry.status.description : undefined}
            outages24h={entry && "status" in entry ? entry.outages24h : undefined}
          />
        );
      })}
    </>
  );
}
