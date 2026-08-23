"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { TrackedIncidentSummary, TrackedMaintenanceSummary } from "@/types/service";
import BoardCard from "@/components/boards/BoardCard";
import CreateBoardForm from "@/components/boards/CreateBoardForm";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { isActiveIncident } from "@/lib/isActiveIncident";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function BoardsPageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const createRef = useRef<HTMLDetailsElement>(null);
  // Same URLs Sidebar already polls globally — usePolledFetch shares one
  // request per URL across every component asking for it, so this adds no
  // extra network traffic on top of what's already happening.
  const { data: incidentsData } = usePolledFetch<{ incidents: TrackedIncidentSummary[] }>("/api/incidents");
  const { data: maintenanceData } = usePolledFetch<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance");

  useCloseDetailsOnOutsideClick(createRef);

  function countsFor(board: Board) {
    const slugs = new Set(board.serviceSlugs);
    return {
      incidentCount: incidentsData?.incidents.filter((i) => isActiveIncident(i) && slugs.has(i.service.slug)).length ?? 0,
      maintenanceCount: maintenanceData?.maintenances.filter((m) => slugs.has(m.service.slug)).length ?? 0,
    };
  }

  return (
    <div className="w-full max-w-6xl self-start">
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

      {boards.length === 0 ? (
        <div className="border-base-300 mt-4 flex flex-col items-center gap-1 rounded-box border border-dashed py-16 text-center">
          <p className="text-base-content/60 text-sm">{t("boards.empty")}</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} {...countsFor(board)} />
          ))}
        </ul>
      )}
    </div>
  );
}
