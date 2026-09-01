"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { mergeParams } from "@/lib/mergeParams";
import { useSelectedBoard } from "@/hooks/useSelectedBoard";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import AddServiceButton from "@/components/service/AddServiceButton";
import BoardFilterSelect from "@/components/service/BoardFilterSelect";
import NoServicesMessage from "@/components/service/NoServicesMessage";

const POLL_INTERVAL_MS = 60_000;

export default function MonitorsPageContent({
  catalog,
  trackedSlugs,
  boards,
}: {
  catalog: Catalog[];
  trackedSlugs: string[];
  boards: Board[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  const boardId = searchParams.get("board") ?? "";
  const selectedBoard = boards.find((board) => board.id === boardId);
  const myServices = catalog.filter(
    (entry) => trackedSlugs.includes(entry.slug) && (!selectedBoard || selectedBoard.Slugs.includes(entry.slug)),
  );

  const { selectedBoardId, setSelectedBoardId } = useSelectedBoard();
  // No ?board= yet and the persisted cross-page pick (see
  // hooks/useSelectedBoard) still refers to a real board — apply it once,
  // same one-shot idiom used by the other board-aware pages.
  useEffect(() => {
    if (!searchParams.has("board") && selectedBoardId && boards.some((b) => b.id === selectedBoardId)) {
      router.replace(`/monitors?${mergeParams(searchParams, { board: selectedBoardId }).toString()}`, { scroll: false });
    }
  }, [searchParams, selectedBoardId, boards, router]);

  function selectBoard(newBoardId: string) {
    router.replace(`/monitors?${mergeParams(searchParams, { board: newBoardId || null }).toString()}`, { scroll: false });
    setSelectedBoardId(newBoardId);
  }

  const { data, isError: fetchFailed } = useQuery({
    queryKey: queryKeys.catalogStatus(),
    queryFn: () => fetchJson<ServiceStatusBatchResponse>("/api/status/catalog", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  // This is the all-boards aggregate view, not one specific board's page
  // — a service can be on several of the current user's own boards at
  // once, so "remove" here means untrack everywhere, not "which board did
  // you mean." Removing from just one board is still available from that
  // board's own page (BoardDetailContent), unaffected by this.
  const removeMutation = useMutation({
    mutationFn: (entry: Catalog) => fetch(`/api/monitors/${entry.slug}`, { method: "DELETE" }),
    onSettled: () => setRemovingSlug(null),
    onSuccess: (res) => {
      if (!res.ok) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
      router.refresh();
    },
  });

  function handleRemove(entry: Catalog) {
    setRemovingSlug(entry.slug);
    removeMutation.mutate(entry);
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base-content text-lg font-semibold">{t("monitors.myServices")}</h1>
        <div className="flex items-center gap-2">
          <BoardFilterSelect boards={boards} value={boardId} onChange={selectBoard} />
          <AddServiceButton />
        </div>
      </div>
      <p className="text-base-content/60 mt-1 text-sm">{t("services.subtitle")}</p>

      {myServices.length === 0 ? (
        <div className="mt-4">
          <NoServicesMessage />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] gap-4">
          <CatalogServiceGrid
            catalog={myServices}
            trackedHosts={[]}
            data={data}
            fetchFailed={fetchFailed}
            removingSlug={removingSlug}
            onRemove={handleRemove}
          />
        </div>
      )}
    </>
  );
}
