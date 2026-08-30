"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { KeywordWatch } from "@/types/earlyWarning";
import Spinner from "@/components/Spinner";

// Same one-at-a-time add pattern as EmailConnectForm
// (components/integrations/EmailConnectForm.tsx).
export default function KeywordForm({
  keywords,
  isSubmitting,
  error,
  onAdd,
  onRemove,
}: {
  keywords: KeywordWatch[];
  isSubmitting: boolean;
  error: string | null;
  onAdd: (keyword: string) => void;
  onRemove: (id: string) => void;
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
    <div className="flex flex-col gap-2">
      <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("earlyWarnings.keywords")}</span>
      {keywords.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {keywords.map((watch) => (
            <li key={watch.id} className="badge badge-soft gap-1.5">
              {watch.keyword}
              <button type="button" onClick={() => onRemove(watch.id)} className="text-error" aria-label={t("earlyWarnings.removeKeyword")}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("earlyWarnings.keywordPlaceholder")}
          className="input input-sm input-bordered flex-1"
        />
        <button type="submit" disabled={isSubmitting || !value.trim()} className="btn btn-primary btn-sm">
          {isSubmitting ? <Spinner size="xs" /> : t("earlyWarnings.addKeyword")}
        </button>
      </form>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
