"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { WebhookTarget } from "@/types/integration";
import ImpactFilterCheckboxes from "@/features/integrations/components/ImpactFilterCheckboxes";
import WebhookTargetRow from "@/features/integrations/components/WebhookTargetRow";
import ModalFormFooter from "@/components/ModalFormFooter";
import { useImpactToggle } from "@/features/integrations/hooks/useImpactToggle";

// Unlike Email/SmsConnectForm, there's no pending/verified split — a
// webhook target has no human on the other end to confirm it, so it's
// gated up front instead: the API route sends a real test ping and only
// ever saves the row if that succeeds (see app/api/integrations/webhook's
// POST handler). By the time a target shows up in `targets` here, it's
// already live.
export default function WebhookConnectForm({
  targets,
  notifyImpacts,
  onAdd,
  onRemove,
  onUpdateImpacts,
  onCancel,
  isSubmitting,
  error,
}: {
  targets: WebhookTarget[];
  notifyImpacts: string[];
  // Takes the currently-checked severities too, not just the URL — see the
  // comment on this same parameter in SmsConnectForm for why.
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
      {targets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {targets.map((target) => (
            <WebhookTargetRow key={target.value} value={target.value} secret={target.secret} onRemove={() => onRemove(target.value)} />
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-1 py-1">
        <p className="text-base-content/60 text-xs">{t("integrations.webhookSeverityHelp")}</p>
        <ImpactFilterCheckboxes selected={impacts} onToggle={toggleImpact} />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("integrations.webhookPlaceholder")}
          className="input input-sm input-bordered w-full"
          // <dialog>'s showModal() re-runs its own focusing steps on every
          // call (not just once on mount like plain HTML autofocus), so
          // this keeps working even though the dialog stays mounted and is
          // just shown/hidden — see the sibling comment in SmsConnectForm.
          autoFocus
        />
        {error && <p className="text-error text-xs">{error}</p>}
        <ModalFormFooter
          onCancel={onCancel}
          cancelLabel={t("integrations.cancel")}
          submitLabel={t("integrations.addWebhook")}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}
