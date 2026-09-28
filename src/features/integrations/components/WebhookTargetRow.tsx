"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export default function WebhookTargetRow({ value, secret, onRemove }: { value: string; secret: string; onRemove: () => void }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();

  return (
    <li className="flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate">{value}</span>
        <button type="button" onClick={onRemove} className="text-error shrink-0" aria-label={t("integrations.removeRecipient")}>
          ×
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-base-content/50">{t("integrations.webhookSecret")}:</span>
        <code className="bg-base-300/40 min-w-0 flex-1 truncate rounded px-1 py-0.5">{secret}</code>
        <button type="button" onClick={() => copy(secret)} className="link link-hover shrink-0 text-[10px]">
          {copied ? t("integrations.copied") : t("integrations.copy")}
        </button>
      </div>
    </li>
  );
}
