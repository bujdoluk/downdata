"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { TrackedIncidentSummary, TrackedMaintenanceSummary } from "@/types/service";
import BoardCard from "@/components/boards/BoardCard";
import CreateBoardForm from "@/components/boards/CreateBoardForm";
import { PlusIcon } from "@/components/icons/NavIcons";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { usePinned } from "@/hooks/usePinned";
import { isActiveIncident } from "@/lib/isActiveIncident";

const POLL_INTERVAL_MS = 60_000;

export default function BoardsPageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const createRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const { pinned, togglePin } = usePinned("pinnedBoards");
  // Same query keys Sidebar/IncidentsPageContent/MaintenancePageContent
  // already poll — React Query shares one cache entry per key across every
  // component asking for it, so this adds no extra network traffic on top
  // of what's already happening.
  const { data: incidentsData } = useQuery({
    queryKey: queryKeys.incidents.list(),
    queryFn: () => fetchJson<{ incidents: TrackedIncidentSummary[] }>("/api/incidents", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const { data: maintenanceData } = useQuery({
    queryKey: queryKeys.maintenance.list(),
    queryFn: () => fetchJson<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  useCloseDetailsOnOutsideClick(createRef);

  const trimmedQuery = query.trim().toLowerCase();
  const filteredBoards = boards
    .filter((board) => !trimmedQuery || board.name.toLowerCase().includes(trimmedQuery))
    .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));

  function countsFor(board: Board) {
    const slugs = new Set(board.Slugs);
    return {
      incidentCount: incidentsData?.incidents.filter((i) => isActiveIncident(i) && slugs.has(i.service.slug)).length ?? 0,
      maintenanceCount: maintenanceData?.maintenances.filter((m) => slugs.has(m.service.slug)).length ?? 0,
    };
  }

  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base-content text-lg font-semibold">{t("boards.title")}</h1>
        <details
          ref={createRef}
          className="dropdown dropdown-end"
          onToggle={(e) => {
            if (e.currentTarget.open) {
              e.currentTarget.querySelector("input")?.focus();
            }
          }}
        >
          <summary className="btn btn-info btn-sm list-none">
            <PlusIcon />
            {t("boards.addBoard")}
          </summary>
          <div className="dropdown-content bg-base-100 border-base-300 z-30 mt-2 w-72 rounded-box border p-3 shadow-xl">
            <CreateBoardForm onCreated={(board) => router.push(`/boards/${board.id}`)} />
          </div>
        </details>
      </div>
      <p className="text-base-content/60 mt-1 text-sm">{t("boards.subtitle")}</p>

      {boards.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("boards.searchPlaceholder")}
          className="input input-bordered input-sm mt-4 w-full max-w-sm"
        />
      )}

      {boards.length === 0 ? (
        <div className="border-base-300 mt-4 flex flex-col items-center gap-1 rounded-box border border-dashed py-16 text-center">
          <p className="text-base-content/60 text-sm">{t("boards.empty")}</p>
        </div>
      ) : filteredBoards.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("boards.noMatches")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filteredBoards.map((board) => (
            <BoardCard key={board.id} board={board} {...countsFor(board)} isPinned={pinned.has(board.id)} onTogglePin={togglePin} />
          ))}
        </ul>
      )}
    </div>
  );
}
