"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { CatalogEntry } from "@/types/service";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import AddServiceButton from "@/components/service/AddServiceButton";
import NoServicesMessage from "@/components/service/NoServicesMessage";

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
        <div className="mt-4 grid grid-cols-3 gap-4">
          <CatalogServiceGrid
            catalog={myServices}
            trackedHosts={[]}
            removingSlug={removingSlug}
            onRemove={handleRemove}
          />
        </div>
      )}
    </>
  );
}
