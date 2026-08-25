"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog } from "@/types/service";
import { useCatalogStatus } from "@/lib/useCatalogStatus";
import { notifyServicesChanged } from "@/lib/servicesChanged";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import AddServiceButton from "@/components/service/AddServiceButton";
import NoServicesMessage from "@/components/service/NoServicesMessage";

export default function MonitorsPageContent({ catalog, trackedHosts }: { catalog: Catalog[]; trackedHosts: string[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const myServices = catalog.filter((entry) => trackedHosts.includes(entry.host));
  const { data, fetchFailed } = useCatalogStatus();

  async function handleRemove(entry: Catalog) {
    setRemovingSlug(entry.slug);
    try {
      const res = await fetch(`/api/services/${entry.slug}`, { method: "DELETE" });
      if (res.ok) {
        notifyServicesChanged();
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
