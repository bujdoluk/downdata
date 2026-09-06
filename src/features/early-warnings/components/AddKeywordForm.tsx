"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Spinner from "@/components/Spinner";

export default function AddKeywordForm({
  isSubmitting,
  error,
  onAdd,
}: {
  isSubmitting: boolean;
  error: string | null;
  onAdd: (keyword: string) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <div className="ml-auto flex flex-col items-end gap-1">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("earlyWarnings.keywordPlaceholder")}
          className="input input-sm input-bordered"
        />
        <button type="submit" disabled={isSubmitting || !value.trim()} className="btn btn-info btn-sm">
          {isSubmitting ? <Spinner size="xs" /> : t("earlyWarnings.addKeyword")}
        </button>
      </form>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
