"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";

export default function CustomServiceForm({ boardId, onAdded }: { boardId: string | undefined; onAdded: (board: Board) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");

  const addMutation = useMutation({
    mutationFn: async ({ name: trimmedName, host: trimmedHost }: { name: string; host: string }) => {
      if (!boardId) throw new Error(t("addService.pickBoardFirst"));
      const res = await fetch(`/api/boards/${boardId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, host: trimmedHost }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("addService.somethingWrong"));
      return data as Board;
    },
    onSuccess: (board) => {
      setName("");
      setHost("");
      setOpen(false);
      onAdded(board);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addMutation.mutate({ name: name.trim(), host: host.trim() });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="link link-hover text-info mt-3 text-sm">
        {t("addService.customToggle")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-base-300 mt-3 flex flex-wrap items-end gap-2 rounded-box border border-dashed p-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="custom-service-name" className="text-base-content/60 text-xs">
          {t("addService.customName")}
        </label>
        <input
          id="custom-service-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input input-bordered input-sm w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="custom-service-host" className="text-base-content/60 text-xs">
          {t("addService.customHost")}
        </label>
        <input
          id="custom-service-host"
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="status.example.com"
          required
          className="input input-bordered input-sm w-52"
        />
      </div>
      <button type="submit" disabled={addMutation.isPending} className="btn btn-info btn-sm">
        {addMutation.isPending ? t("addService.adding") : t("addService.add")}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
        {t("addService.customCancel")}
      </button>
      {addMutation.isError && (
        <div role="alert" className="alert alert-error alert-soft basis-full py-2 text-xs">
          <span>{addMutation.error.message}</span>
        </div>
      )}
    </form>
  );
}
