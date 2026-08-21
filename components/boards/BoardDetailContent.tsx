"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { CatalogCategory, CatalogEntry } from "@/types/service";
import { useCatalogStatus } from "@/lib/useCatalogStatus";
import { notifyServicesChanged } from "@/lib/servicesChanged";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";

const CATEGORY_ORDER: CatalogCategory[] = ["infrastructure", "devtools", "database", "communication", "ai"];

export default function BoardDetailContent({
  board,
  catalog,
  trackedHosts,
}: {
  board: Board;
  catalog: CatalogEntry[];
  trackedHosts: string[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, fetchFailed } = useCatalogStatus();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [pendingHost, setPendingHost] = useState<string | null>(null);
  const [addedHosts, setAddedHosts] = useState<Set<string>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(board.name);
  const [renaming, setRenaming] = useState(false);
  const [query, setQuery] = useState("");

  const onBoardEntries = catalog.filter((entry) => board.serviceSlugs.includes(entry.slug));

  const trimmedQuery = query.trim().toLowerCase();
  const addableEntries = catalog.filter(
    (entry) =>
      !board.serviceSlugs.includes(entry.slug) && (!trimmedQuery || entry.name.toLowerCase().includes(trimmedQuery)),
  );
  const addableGroups = CATEGORY_ORDER.map((category) => ({
    category,
    entries: addableEntries.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);

  async function handleAdd(entry: CatalogEntry) {
    setPendingHost(entry.host);
    try {
      // Untracked services get tracked here in the same click — services.ts's
      // addService dedupes by generated slug, not host, so this check is what
      // keeps an already-tracked host from being tracked a second time.
      if (!trackedHosts.includes(entry.host)) {
        const trackRes = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: entry.name, host: entry.host }),
        });
        if (!trackRes.ok) return;
        notifyServicesChanged();
      }

      const res = await fetch(`/api/boards/${board.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: entry.slug }),
      });
      if (res.ok) {
        setAddedHosts((prev) => new Set(prev).add(entry.host));
        router.refresh();
      }
    } finally {
      setPendingHost(null);
    }
  }

  async function handleRemove(entry: CatalogEntry) {
    setRemovingSlug(entry.slug);
    try {
      const res = await fetch(`/api/boards/${board.id}/services/${entry.slug}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setRemovingSlug(null);
    }
  }

  async function handleRename() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === board.name) {
      setIsEditingName(false);
      setNameDraft(board.name);
      return;
    }

    setRenaming(true);
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setIsEditingName(false);
        router.refresh();
      }
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="w-full max-w-6xl self-start">
      <Link href="/boards" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
        {t("serviceDetail.back")}
      </Link>

      <div className="mt-2 flex items-center gap-2">
        {isEditingName ? (
          <>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("boards.namePlaceholder")}
              className="input input-bordered input-sm"
              autoFocus
            />
            <button type="button" disabled={renaming} onClick={handleRename} className="btn btn-info btn-sm">
              {t("boards.rename")}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-base-content text-lg font-semibold">{board.name}</h1>
            <button
              type="button"
              onClick={() => {
                setNameDraft(board.name);
                setIsEditingName(true);
              }}
              className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
            >
              {t("boards.rename")}
            </button>
          </>
        )}
      </div>

      <h2 className="text-base-content/40 mt-6 mb-3 text-xs font-semibold tracking-wide uppercase">{t("boards.onBoard")}</h2>
      {onBoardEntries.length === 0 ? (
        <p className="text-base-content/50 text-sm">{t("boards.noServicesOnBoard")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogServiceGrid
            catalog={onBoardEntries}
            trackedHosts={[]}
            data={data}
            fetchFailed={fetchFailed}
            removingSlug={removingSlug}
            onRemove={handleRemove}
          />
        </div>
      )}

      <h2 className="text-base-content/40 mt-8 mb-3 text-xs font-semibold tracking-wide uppercase">{t("boards.addServices")}</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("nav.searchPlaceholder")}
        className="input input-bordered input-sm w-full max-w-sm"
      />

      {addableEntries.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("nav.noServicesFound")}</p>
      ) : (
        <div className="mt-4">
          {addableGroups.map(({ category, entries }) => (
            <div key={category} className="mb-8">
              <h3 className="text-base-content/40 mb-3 text-xs font-semibold tracking-wide uppercase">
                {t(`addService.category.${category}`)}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <CatalogServiceGrid
                  catalog={entries}
                  trackedHosts={trackedHosts}
                  data={data}
                  fetchFailed={fetchFailed}
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
