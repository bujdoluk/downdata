"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { CatalogCategory, CatalogEntry } from "@/types/service";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import { notifyServicesChanged } from "@/lib/servicesChanged";

const CATEGORY_ORDER: CatalogCategory[] = ["infrastructure", "devtools", "database", "communication", "ai"];

export default function ServiceCatalogPicker({
  catalog,
  trackedHosts,
}: {
  catalog: CatalogEntry[];
  trackedHosts: string[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [addedHosts, setAddedHosts] = useState<Set<string>>(() => new Set(trackedHosts));
  const [pendingHost, setPendingHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const visibleCatalog = trimmedQuery
    ? catalog.filter((entry) => entry.name.toLowerCase().includes(trimmedQuery))
    : catalog;
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    entries: visibleCatalog.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);

  async function handleAdd(entry: CatalogEntry) {
    setPendingHost(entry.host);
    setError(null);

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entry.name, host: entry.host }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("addService.somethingWrong"));
        setPendingHost(null);
        return;
      }

      setAddedHosts((prev) => new Set(prev).add(entry.host));
      setPendingHost(null);
      notifyServicesChanged();
      router.refresh();
    } catch {
      setError(t("addService.somethingWrong"));
      setPendingHost(null);
    }
  }

  return (
    <div className="grid w-full max-w-6xl grid-cols-[auto_1fr] gap-x-3 self-start">
      <Link
        href="/"
        className="link link-hover text-base-content/50 hover:text-base-content col-start-1 row-start-1 self-center text-xs font-medium"
      >
        {t("addService.back")}
      </Link>

      <h1 className="text-base-content col-start-2 text-lg font-semibold">{t("addService.title")}</h1>
      <p className="text-base-content/60 col-start-2 mt-1 text-sm">{t("addService.subtitle")}</p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("nav.searchPlaceholder")}
        className="input input-bordered input-sm col-start-2 mt-4 w-full max-w-sm"
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft col-start-2 mt-3 py-2 text-xs">
          <span>{error}</span>
        </div>
      )}

      {visibleCatalog.length === 0 ? (
        <p className="text-base-content/50 col-start-2 mt-4 text-sm">{t("nav.noServicesFound")}</p>
      ) : (
        <div className="col-start-2 mt-4">
          {groups.map(({ category, entries }) => (
            <div key={category} className="mb-8">
              <h2 className="text-base-content/40 mb-3 text-xs font-semibold tracking-wide uppercase">
                {t(`addService.category.${category}`)}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CatalogServiceGrid
                  catalog={entries}
                  trackedHosts={trackedHosts}
                  pendingHost={pendingHost}
                  addedHosts={addedHosts}
                  onAdd={handleAdd}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
