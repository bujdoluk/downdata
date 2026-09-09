"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Recipient } from "@/types/integration";
import ImpactFilterCheckboxes from "@/features/integrations/components/ImpactFilterCheckboxes";
import VerifiedRecipientRow from "@/features/integrations/components/VerifiedRecipientRow";
import ModalFormFooter from "@/features/integrations/components/ModalFormFooter";
import { useImpactToggle } from "@/features/integrations/hooks/useImpactToggle";

// Recipient verification means "connect" is no longer a single bulk
// submit — each address is added one at a time, starts pending, and
// becomes active once its confirmation link is clicked (outside this
// form entirely, from the recipient's own inbox).
export default function EmailConnectForm({
  recipients,
  notifyImpacts,
  onAdd,
  onRemove,
  onUpdateImpacts,
  onCancel,
  isSubmitting,
  error,
}: {
  recipients: Recipient[];
  notifyImpacts: string[];
  // Takes the currently-checked severities too, not just the address —
  // see the comment on this same parameter in SmsConnectForm for why.
  onAdd: (value: string, notifyImpacts: string[]) => void;
  onRemove: (value: string) => void;
  onUpdateImpacts: (impacts: string[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const { impacts, toggleImpact } = useImpactToggle(notifyImpacts, onUpdateImpacts);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed, [...impacts]);
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
                  <button type="button" onClick={() => onAdd(recipient.value, [...impacts])} className="link link-hover text-[10px]">
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
      <div className="flex flex-col gap-1 py-1">
        <p className="text-base-content/60 text-xs">{t("integrations.emailSeverityHelp")}</p>
        <ImpactFilterCheckboxes selected={impacts} onToggle={toggleImpact} />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("integrations.emailPlaceholder")}
          className="input input-sm input-bordered w-full"
          // <dialog>'s showModal() re-runs its own focusing steps on every
          // call (not just once on mount like plain HTML autofocus), so
          // this keeps working even though the dialog stays mounted and is
          // just shown/hidden — see the sibling comment in SmsConnectForm.
          autoFocus
        />
        {error && <p className="text-error text-xs">{error}</p>}
        <ModalFormFooter onCancel={onCancel} submitLabel={t("integrations.addRecipient")} isSubmitting={isSubmitting} />
      </form>
    </div>
  );
}
