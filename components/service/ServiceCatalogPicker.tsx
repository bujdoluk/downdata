"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { CatalogEntry } from "@/types/service";
import CatalogBrowser from "@/components/service/CatalogBrowser";
import { notifyServicesChanged } from "@/lib/servicesChanged";

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
    <div className="flex w-full max-w-6xl flex-col self-start">
      <Link
        href="/"
        className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
      >
        {t("addService.back")}
      </Link>

      <h1 className="text-base-content mt-2 text-lg font-semibold">{t("addService.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("addService.subtitle")}</p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("nav.searchPlaceholder")}
        className="input input-bordered input-sm mt-4 w-full max-w-sm"
        autoFocus
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4">
        <CatalogBrowser
          catalog={catalog}
          trackedHosts={trackedHosts}
          pendingHost={pendingHost}
          addedHosts={addedHosts}
          onAdd={handleAdd}
          query={query}
        />
      </div>
    </div>
  );
}
