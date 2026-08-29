"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Recipient } from "@/types/integration";
import VerifiedRecipientRow from "@/components/integrations/VerifiedRecipientRow";
import Spinner from "@/components/Spinner";

// Recipient verification means "connect" is no longer a single bulk
// submit — each address is added one at a time, starts pending, and
// becomes active once its confirmation link is clicked (outside this
// form entirely, from the recipient's own inbox).
export default function EmailConnectForm({
  recipients,
  onAdd,
  onRemove,
  isSubmitting,
  error,
}: {
  recipients: Recipient[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  isSubmitting: boolean;
  error: string | null;
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
      {recipients.length > 0 && (
        <ul className="flex flex-col gap-1">
          {recipients.map((recipient) =>
            recipient.verified ? (
              <VerifiedRecipientRow key={recipient.value} value={recipient.value} onRemove={() => onRemove(recipient.value)} />
            ) : (
              <li key={recipient.value} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">{recipient.value}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="badge badge-soft badge-warning badge-xs">{t("integrations.pending")}</span>
                  <button type="button" onClick={() => onAdd(recipient.value)} className="link link-hover text-[10px]">
                    {t("integrations.resend")}
                  </button>
                  <button type="button" onClick={() => onRemove(recipient.value)} className="text-error" aria-label={t("integrations.removeRecipient")}>
                    ×
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("integrations.emailPlaceholder")}
          className="input input-sm input-bordered w-full"
        />
        {error && <p className="text-error text-xs">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-xs">
          {isSubmitting ? <Spinner size="xs" /> : t("integrations.addRecipient")}
        </button>
      </form>
    </div>
  );
}
