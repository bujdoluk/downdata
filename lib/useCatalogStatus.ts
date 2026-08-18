"use client";

import type { ServiceStatusBatchResponse } from "@/types/service";
import { usePolledFetch } from "@/lib/usePolledFetch";

export function useCatalogStatus() {
  const { data, error } = usePolledFetch<ServiceStatusBatchResponse>("/api/status/catalog");
  return { data, fetchFailed: error };
}
