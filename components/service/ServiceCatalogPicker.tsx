"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CatalogEntry } from "@/lib/serviceCatalog";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";

export default function ServiceCatalogPicker({ catalog }: { catalog: CatalogEntry[] }) {
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
        setError(data.error ?? "Something went wrong.");
        setPendingHost(null);
        return;
      }

      // Added — drop it from the pick list and refresh the router cache so
      // the home page's server-fetched list picks it up next visit.
      setAvailable((prev) => prev.filter((e) => e.host !== entry.host));
      setPendingHost(null);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setPendingHost(null);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <Link
        href="/"
        className="mb-6 inline-block text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-white/50 dark:hover:text-white"
      >
        ← Back
      </Link>

      <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Add a service</h1>
      <p className="mt-1 text-xs text-neutral-500 dark:text-white/50">
        Choose a service to start tracking it.
      </p>

      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {available.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-white/50">
          You&rsquo;re already tracking everything in the catalog.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {available.map((entry) => {
            const Logo = SERVICE_LOGOS[entry.slug] ?? FallbackLogo;
            const isPending = pendingHost === entry.host;
            return (
              <li
                key={entry.host}
                className="flex flex-col items-center gap-2 border border-black/10 p-3 text-center dark:border-white/10"
              >
                <Logo size={24} name={entry.name} />
                <span className="text-sm text-neutral-900 dark:text-white">{entry.name}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAdd(entry)}
                  className="mt-1 w-full border border-black/10 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                >
                  {isPending ? "Adding…" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
