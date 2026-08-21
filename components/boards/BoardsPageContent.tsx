"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import BoardCard from "@/components/boards/BoardCard";
import CreateBoardForm from "@/components/boards/CreateBoardForm";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const createRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(createRef);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="w-full max-w-6xl self-start">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base-content text-lg font-semibold">{t("boards.title")}</h1>
        <details ref={createRef} className="dropdown dropdown-end">
          <summary className="btn btn-info btn-sm list-none">
            <PlusIcon />
            {t("boards.create")}
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
            <BoardCard key={board.id} board={board} deleting={deletingId === board.id} onDelete={() => handleDelete(board.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
