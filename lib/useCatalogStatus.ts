"use client";

import { useEffect, useState } from "react";
import type { ServiceStatusBatchResponse } from "@/types/service";

const POLL_INTERVAL_MS = 30_000;

export function useCatalogStatus() {
  const [data, setData] = useState<ServiceStatusBatchResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/status/catalog", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as ServiceStatusBatchResponse;
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

  return { data, fetchFailed };
}
