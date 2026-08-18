"use client";

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
  const myServices = catalog.filter((entry) => trackedHosts.includes(entry.host));

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
          {/* trackedHosts={[]}: every card here is already tracked, so the
              "Monitoring" badge would be redundant noise. */}
          <CatalogServiceGrid catalog={myServices} trackedHosts={[]} />
        </div>
      )}
    </>
  );
}
