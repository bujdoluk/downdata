"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Recipient } from "@/types/integration";
import ImpactFilterCheckboxes from "@/features/integrations/components/ImpactFilterCheckboxes";
import VerifiedRecipientRow from "@/features/integrations/components/VerifiedRecipientRow";
import ModalFormFooter from "@/components/ModalFormFooter";
import { useImpactToggle } from "@/features/integrations/hooks/useImpactToggle";

function PendingRecipientRow({
  recipient,
  notifyImpacts,
  onVerify,
  onResend,
  onRemove,
  isVerifying,
  verifyError,
}: {
  recipient: Recipient;
  notifyImpacts: string[];
  onVerify: (value: string, code: string) => void;
  onResend: (value: string, notifyImpacts: string[]) => void;
  onRemove: (value: string) => void;
  isVerifying: boolean;
  verifyError: string | null;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    onVerify(recipient.value, trimmed);
  }

  return (
    <li className="flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate">{recipient.value}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="badge badge-soft badge-warning badge-xs">{t("integrations.pending")}</span>
          <button type="button" onClick={() => onRemove(recipient.value)} className="text-error" aria-label={t("integrations.removeRecipient")}>
            ×
          </button>
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t("integrations.codePlaceholder")}
          className="input input-xs input-bordered w-24"
        />
        <button type="submit" disabled={isVerifying} className="btn btn-xs btn-primary">
          {t("integrations.verify")}
        </button>
        <button type="button" onClick={() => onResend(recipient.value, notifyImpacts)} className="link link-hover text-[10px]">
          {t("integrations.resendCode")}
        </button>
      </form>
      {verifyError && (
        <p role="alert" className="text-error">
          {verifyError}
        </p>
      )}
    </li>
  );
}

// Recipient verification means "connect" is no longer a single bulk
// submit — each number is added one at a time, texted a one-time code
// immediately, and stays pending until that code is entered back here.
export default function SmsConnectForm({
  recipients,
  notifyImpacts,
  onAdd,
  onRemove,
  onVerify,
  onResend,
  onUpdateImpacts,
  onCancel,
  isSubmitting,
  isVerifying,
  error,
  verifyError,
}: {
  recipients: Recipient[];
  notifyImpacts: string[];
  // Takes the currently-checked severities too, not just the number — the
  // connect POST only ever seeds notifyImpacts on first connect (see
  // addIntegration's comment), and before that first connect there's no
  // integration row yet for a checkbox-toggle PATCH to update, so it's a
  // silent no-op. Passing the current selection along with the very first
  // add is the only way choosing severities before ever connecting
  // actually takes effect.
  onAdd: (value: string, notifyImpacts: string[]) => void;
  onRemove: (value: string) => void;
  onVerify: (value: string, code: string) => void;
  onResend: (value: string, notifyImpacts: string[]) => void;
  onUpdateImpacts: (impacts: string[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isVerifying: boolean;
  error: string | null;
  verifyError: string | null;
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
        <ul className="flex flex-col gap-2">
          {recipients.map((recipient) =>
            recipient.verified ? (
              <VerifiedRecipientRow key={recipient.value} value={recipient.value} onRemove={() => onRemove(recipient.value)} />
            ) : (
              <PendingRecipientRow
                key={recipient.value}
                recipient={recipient}
                notifyImpacts={[...impacts]}
                onVerify={onVerify}
                onResend={onResend}
                onRemove={onRemove}
                isVerifying={isVerifying}
                verifyError={verifyError}
              />
            ),
          )}
        </ul>
      )}
      <div className="flex flex-col gap-1 py-1">
        <p className="text-base-content/60 text-xs">{t("integrations.smsSeverityHelp")}</p>
        <ImpactFilterCheckboxes selected={impacts} onToggle={toggleImpact} />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("integrations.smsPlaceholder")}
          className="input input-sm input-bordered w-full"
          // <dialog>'s showModal() re-runs its own focusing steps on every
          // call (not just once on mount like plain HTML autofocus), so
          // this keeps working even though the dialog stays mounted and is
          // just shown/hidden. Only on this main add-number input, not
          // PendingRecipientRow's per-row code input above.
          autoFocus
        />
        {error && (
          <p role="alert" className="text-error text-xs">
            {error}
          </p>
        )}
        <ModalFormFooter
          onCancel={onCancel}
          cancelLabel={t("integrations.cancel")}
          submitLabel={t("integrations.addRecipient")}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}
