"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { CatalogEntry } from "@/types/service";
import { useCatalogStatus } from "@/lib/useCatalogStatus";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import AddServiceButton from "@/components/service/AddServiceButton";
import NoServicesMessage from "@/components/service/NoServicesMessage";
import StatusSummary from "@/components/service/StatusSummary";

export default function ServicesPageContent({
  catalog,
  trackedHosts,
}: {
  catalog: CatalogEntry[];
  trackedHosts: string[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const myServices = catalog.filter((entry) => trackedHosts.includes(entry.host));
  const { data, fetchFailed } = useCatalogStatus();

  const counts = { critical: 0, major: 0, minor: 0, none: 0 };
  if (data) {
    for (const entry of myServices) {
      const status = data[entry.slug];
      if (!status || !("status" in status)) continue;
      const indicator = status.status.indicator;
      if (indicator === "critical" || indicator === "major" || indicator === "minor" || indicator === "none") {
        counts[indicator]++;
      }
    }
  }

  async function handleRemove(entry: CatalogEntry) {
    setRemovingSlug(entry.slug);
    try {
      const res = await fetch(`/api/services/${entry.slug}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setRemovingSlug(null);
      }
    } catch {
      setRemovingSlug(null);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base-content text-lg font-semibold">{t("services.title")}</h1>
        <AddServiceButton />
      </div>

      {myServices.length === 0 ? (
        <div className="mt-4">
          <NoServicesMessage />
        </div>
      ) : (
        <>
          <StatusSummary counts={counts} isLoading={!data && !fetchFailed} />

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
        </>
      )}
    </>
  );
}
