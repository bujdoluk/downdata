"use client";

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { WebhookTarget } from "@/types/integration";
import ImpactFilterCheckboxes from "@/features/integrations/components/ImpactFilterCheckboxes";
import WebhookTargetRow from "@/features/integrations/components/WebhookTargetRow";
import ModalFormFooter from "@/components/ModalFormFooter";
import { useImpactToggle } from "@/features/integrations/hooks/useImpactToggle";

// No pending state: the route only saves a target after a successful test ping.
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
  // Carries severities: before first connect there's no row for the toggle PATCH to update.
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
          // Works in a mounted dialog: showModal() re-runs focusing on every open.
          autoFocus
        />
        {error && (
          <p role="alert" className="text-error text-xs break-words">
            {error}
          </p>
        )}
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
