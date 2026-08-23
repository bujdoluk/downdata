"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";

export default function CreateBoardForm({ onCreated }: { onCreated: (board: Board) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("addService.somethingWrong"));
        return;
      }
      setName("");
      onCreated(data);
    } catch {
      setError(t("addService.somethingWrong"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("boards.namePlaceholder")}
          className="input input-bordered input-sm flex-1"
        />
        <button type="submit" disabled={creating || !name.trim()} className="btn btn-info btn-sm">
          {t("boards.createSubmit")}
        </button>
      </form>

      {error && (
        <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
