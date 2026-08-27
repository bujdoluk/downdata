"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import AddServiceButton from "@/components/service/AddServiceButton";
import NoServicesMessage from "@/components/service/NoServicesMessage";

const POLL_INTERVAL_MS = 60_000;

export default function MonitorsPageContent({ catalog, trackedHosts }: { catalog: Catalog[]; trackedHosts: string[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const myServices = catalog.filter((entry) => trackedHosts.includes(entry.host));
  const { data, isError: fetchFailed } = useQuery({
    queryKey: queryKeys.catalogStatus(),
    queryFn: () => fetchJson<ServiceStatusBatchResponse>("/api/status/catalog", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const removeMutation = useMutation({
    mutationFn: (entry: Catalog) => fetch(`/api/services/${entry.slug}`, { method: "DELETE" }),
    onSettled: () => setRemovingSlug(null),
    onSuccess: (res) => {
      if (!res.ok) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
      router.refresh();
    },
  });

  function handleRemove(entry: Catalog) {
    setRemovingSlug(entry.slug);
    removeMutation.mutate(entry);
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base-content text-lg font-semibold">{t("monitors.myServices")}</h1>
        <AddServiceButton />
      </div>
      <p className="text-base-content/60 mt-1 text-sm">{t("services.subtitle")}</p>

      {myServices.length === 0 ? (
        <div className="mt-4">
          <NoServicesMessage />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogServiceGrid
            catalog={myServices}
            trackedHosts={[]}
            data={data}
            fetchFailed={fetchFailed}
            removingSlug={removingSlug}
            onRemove={handleRemove}
          />
        </div>
      )}
    </>
  );
}
