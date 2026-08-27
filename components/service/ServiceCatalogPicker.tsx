"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog } from "@/types/service";
import CatalogBrowser from "@/components/service/CatalogBrowser";
import CustomServiceForm from "@/components/service/CustomServiceForm";
import { queryKeys } from "@/lib/queryKeys";

type Tab = "service" | "website";

export default function ServiceCatalogPicker({
  catalog,
  trackedHosts,
}: {
  catalog: Catalog[];
  trackedHosts: string[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("service");
  const [addedHosts, setAddedHosts] = useState<Set<string>>(() => new Set(trackedHosts));
  const [query, setQuery] = useState("");

  const addMutation = useMutation({
    mutationFn: async (entry: Catalog) => {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entry.name, host: entry.host }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("addService.somethingWrong"));
      return entry;
    },
    onSuccess: (entry) => {
      setAddedHosts((prev) => new Set(prev).add(entry.host));
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
      router.refresh();
    },
  });

  function handleAdd(entry: Catalog) {
    addMutation.mutate(entry);
  }

  return (
    <div className="flex w-full max-w-6xl flex-col self-start">
      <Link
        href="/boards"
        className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
      >
        {t("addService.back")}
      </Link>

      <h1 className="text-base-content mt-2 text-lg font-semibold">{t("addService.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("addService.subtitle")}</p>

      <div role="tablist" className="tabs tabs-box mt-4 w-fit">
        <button
          type="button"
          role="tab"
          onClick={() => setTab("service")}
          className={`tab ${tab === "service" ? "tab-active" : ""}`}
        >
          {t("addService.tabService")}
        </button>
        <button
          type="button"
          role="tab"
          onClick={() => setTab("website")}
          className={`tab ${tab === "website" ? "tab-active" : ""}`}
        >
          {t("addService.tabWebsite")}
        </button>
      </div>

      {tab === "website" ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("addService.websiteComingSoon")}</p>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("nav.searchPlaceholder")}
            className="input input-bordered input-sm mt-4 w-full max-w-sm"
            autoFocus
          />

          {addMutation.isError && (
            <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
              <span>{addMutation.error.message}</span>
            </div>
          )}

          <CustomServiceForm onAdded={() => router.refresh()} />

          <div className="mt-4">
            <CatalogBrowser
              catalog={catalog}
              trackedHosts={trackedHosts}
              pendingHost={addMutation.isPending ? (addMutation.variables?.host ?? null) : null}
              addedHosts={addedHosts}
              onAdd={handleAdd}
              query={query}
            />
          </div>
        </>
      )}
    </div>
  );
}
