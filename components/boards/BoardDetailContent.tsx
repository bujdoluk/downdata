"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { CatalogEntry } from "@/types/service";
import { useCatalogStatus } from "@/lib/useCatalogStatus";
import { useBoardRename } from "@/lib/useBoardRename";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import StatusSummary from "@/components/service/StatusSummary";
import Spinner from "@/components/Spinner";

export default function BoardDetailContent({
  board,
  catalog,
}: {
  board: Board;
  catalog: CatalogEntry[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, fetchFailed } = useCatalogStatus();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const rename = useBoardRename(board);
  const [deleting, setDeleting] = useState(false);
  const confirmRef = useRef<HTMLDialogElement>(null);

  const onBoardEntries = catalog.filter((entry) => board.serviceSlugs.includes(entry.slug));

  const overviewCounts = { critical: 0, major: 0, minor: 0, none: 0 };
  if (data) {
    for (const entry of onBoardEntries) {
      const status = data[entry.slug];
      if (!status || !("status" in status)) continue;
      const indicator = status.status.indicator;
      if (indicator === "critical" || indicator === "major" || indicator === "minor" || indicator === "none") {
        overviewCounts[indicator]++;
      }
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

      {onBoardEntries.length > 0 && <StatusSummary counts={overviewCounts} isLoading={!data && !fetchFailed} />}

      <div className="mt-6">
        <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("boards.onBoard")}</h2>

        <div className="mt-3">
          {onBoardEntries.length === 0 ? (
            <p className="text-base-content/50 text-sm">{t("boards.noServicesOnBoard")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
