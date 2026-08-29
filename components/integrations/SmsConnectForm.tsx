"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { SmsIntegration } from "@/types/integration";
import { parseCommaSeparatedList } from "@/lib/parseCommaSeparatedList";
import ImpactFilterCheckboxes from "@/components/service/ImpactFilterCheckboxes";
import Spinner from "@/components/Spinner";

export default function SmsConnectForm({
  current,
  isSubmitting,
  error,
  onSubmit,
}: {
  // The already-connected integration, when this popover is reached by
  // clicking the "Connected" badge (IntegrationCard.tsx) rather than
  // "Connect" — pre-fills the fields for editing instead of starting blank.
  current: SmsIntegration | undefined;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (recipientPhones: string[], notifyImpacts: string[]) => void;
}) {
  const { t } = useTranslation();
  // Major/critical only by default — SMS is the one channel here with a
  // real per-message cost and real intrusiveness, so it opts out of the
  // "notify on everything" behavior Slack/email default to.
  const [notifyImpacts, setNotifyImpacts] = useState<Set<string>>(new Set(current?.notifyImpacts ?? ["major", "critical"]));

  function toggleImpact(impact: string) {
    setNotifyImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(impact)) next.delete(impact);
      else next.add(impact);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("phones");
    if (typeof raw !== "string") return;
    onSubmit(parseCommaSeparatedList(raw), [...notifyImpacts]);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        name="phones"
        defaultValue={current?.recipientPhones.join(", ") ?? ""}
        placeholder={t("integrations.smsPlaceholder")}
        className="input input-sm input-bordered w-full"
      />
      <div className="flex flex-col gap-1 py-1">
        <ImpactFilterCheckboxes selected={notifyImpacts} onToggle={toggleImpact} />
      </div>
      {error && <p className="text-error text-xs">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-xs">
        {isSubmitting ? <Spinner size="xs" /> : current ? t("integrations.save") : t("integrations.connect")}
      </button>
    </form>
  );
}
