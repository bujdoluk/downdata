"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { CatalogEntry } from "@/types/service";
import { useCatalogStatus } from "@/lib/useCatalogStatus";
import { notifyServicesChanged } from "@/lib/servicesChanged";
import { useBoardRename } from "@/lib/useBoardRename";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import AddServiceColumns from "@/components/boards/AddServiceColumns";
import Spinner from "@/components/Spinner";

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
  const rename = useBoardRename(board);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmRef = useRef<HTMLDialogElement>(null);

  const onBoardEntries = catalog.filter((entry) => board.serviceSlugs.includes(entry.slug));

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

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (res.ok) router.push("/boards");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="w-full max-w-6xl self-start">
      <Link href="/boards" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
        {t("serviceDetail.back")}
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {rename.isEditing ? (
            <>
              <input
                type="text"
                value={rename.nameDraft}
                onChange={(e) => rename.setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename.submit();
                  if (e.key === "Escape") rename.cancel();
                }}
                placeholder={t("boards.namePlaceholder")}
                className="input input-bordered input-sm"
                autoFocus
              />
              <button type="button" disabled={rename.renaming} onClick={rename.submit} className="btn btn-info btn-sm">
                {t("boards.rename")}
              </button>
              <button type="button" onClick={rename.cancel} className="btn btn-square btn-sm" aria-label={t("boards.clearName")}>
                ×
              </button>
            </>
          ) : (
            <>
              <h1 className="text-base-content text-lg font-semibold">{board.name}</h1>
              <button
                type="button"
                onClick={rename.startEditing}
                className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
              >
                {t("boards.rename")}
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={() => confirmRef.current?.showModal()}
          className="btn btn-ghost btn-sm text-error shrink-0"
        >
          {deleting ? t("boards.deleting") : t("boards.delete")}
        </button>
      </div>

      <dialog ref={confirmRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("boards.deleteConfirmTitle")}</h3>
          <p className="text-base-content/70 mt-2 text-sm">{t("boards.deleteConfirmMessage", { name: board.name })}</p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                {t("boards.cancel")}
              </button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="btn btn-error btn-sm">
                {deleting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner size="xs" />
                    {t("boards.deleting")}
                  </span>
                ) : (
                  t("boards.delete")
                )}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("boards.cancel")}</button>
        </form>
      </dialog>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("nav.searchPlaceholder")}
        className="input input-bordered input-sm mt-4 w-full max-w-sm"
      />

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-3">
        {/* Explicit row/column placement, not DOM order, is what actually
            aligns the card rows: "On this board" gets its own row (1) so
            it doesn't push its cards down past where the category/service
            columns start — those have no heading of their own, so without
            this they'd start a row higher than the on-board cards. DOM
            order stays heading-then-cards so mobile's single-column stack
            still reads top to bottom correctly; only lg: reassigns rows. */}
        <div className="lg:col-start-1 lg:col-span-2 lg:row-start-2">
          <AddServiceColumns
            board={board}
            catalog={catalog}
            trackedHosts={trackedHosts}
            data={data}
            fetchFailed={fetchFailed}
            pendingHost={pendingHost}
            addedHosts={addedHosts}
            onAdd={handleAdd}
            query={query}
          />
        </div>

        <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase lg:col-start-3 lg:row-start-1">
          {t("boards.onBoard")}
        </h2>

        <div className="lg:col-start-3 lg:row-start-2">
          {onBoardEntries.length === 0 ? (
            <p className="text-base-content/50 text-sm">{t("boards.noServicesOnBoard")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
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
        </div>
      </div>
    </div>
  );
}
