"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { CatalogEntry } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";

export default function ServiceCatalogPicker({ catalog }: { catalog: CatalogEntry[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [available, setAvailable] = useState(catalog);
  const [pendingHost, setPendingHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      setAvailable((prev) => prev.filter((e) => e.host !== entry.host));
      setPendingHost(null);
      router.refresh();
    } catch {
      setError(t("addService.somethingWrong"));
      setPendingHost(null);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <Link href="/" className="link link-hover text-base-content/50 hover:text-base-content mb-6 inline-block text-xs font-medium">
        {t("addService.back")}
      </Link>

      <h1 className="text-base-content text-lg font-semibold">{t("addService.title")}</h1>
      <p className="text-base-content/50 mt-1 text-xs">{t("addService.subtitle")}</p>

      {error && (
        <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
          <span>{error}</span>
        </div>
      )}

      {available.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("addService.allTracked")}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {available.map((entry) => {
            const Logo = SERVICE_LOGOS[entry.slug] ?? FallbackLogo;
            const isPending = pendingHost === entry.host;
            return (
              <li key={entry.host} className="card card-border bg-base-200">
                <div className="card-body items-center gap-2 p-3 text-center">
                  <Logo size={24} name={entry.name} />
                  <span className="text-base-content text-sm">{entry.name}</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAdd(entry)}
                    className="btn btn-outline btn-xs mt-1 w-full"
                  >
                    {isPending ? t("addService.adding") : t("addService.add")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
