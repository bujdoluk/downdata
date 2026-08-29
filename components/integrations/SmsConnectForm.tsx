"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Recipient } from "@/types/integration";
import ImpactFilterCheckboxes from "@/components/service/ImpactFilterCheckboxes";
import VerifiedRecipientRow from "@/components/integrations/VerifiedRecipientRow";
import Spinner from "@/components/Spinner";

function PendingRecipientRow({
  recipient,
  onVerify,
  onResend,
  onRemove,
  isVerifying,
  verifyError,
}: {
  recipient: Recipient;
  onVerify: (value: string, code: string) => void;
  onResend: (value: string) => void;
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
        <button type="button" onClick={() => onResend(recipient.value)} className="link link-hover text-[10px]">
          {t("integrations.resendCode")}
        </button>
      </form>
      {verifyError && <p className="text-error">{verifyError}</p>}
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
  isSubmitting,
  isVerifying,
  error,
  verifyError,
}: {
  recipients: Recipient[];
  notifyImpacts: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onVerify: (value: string, code: string) => void;
  onResend: (value: string) => void;
  onUpdateImpacts: (impacts: string[]) => void;
  isSubmitting: boolean;
  isVerifying: boolean;
  error: string | null;
  verifyError: string | null;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [impacts, setImpacts] = useState<Set<string>>(new Set(notifyImpacts));

  function toggleImpact(impact: string) {
    setImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(impact)) next.delete(impact);
      else next.add(impact);
      onUpdateImpacts([...next]);
      return next;
    });
  }

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
        <ul className="flex flex-col gap-2">
          {recipients.map((recipient) =>
            recipient.verified ? (
              <VerifiedRecipientRow key={recipient.value} value={recipient.value} onRemove={() => onRemove(recipient.value)} />
            ) : (
              <PendingRecipientRow
                key={recipient.value}
                recipient={recipient}
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
        <ImpactFilterCheckboxes selected={impacts} onToggle={toggleImpact} />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("integrations.smsPlaceholder")}
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
