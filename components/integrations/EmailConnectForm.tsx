"use client";

import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { parseCommaSeparatedList } from "@/lib/parseCommaSeparatedList";
import Spinner from "@/components/Spinner";

export default function EmailConnectForm({
  currentEmails,
  isSubmitting,
  error,
  onSubmit,
}: {
  // The already-connected integration's recipients, when this popover is
  // reached by clicking the "Connected" badge rather than "Connect" —
  // pre-fills the field for editing instead of starting blank.
  currentEmails: string[] | undefined;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (recipientEmails: string[]) => void;
}) {
  const { t } = useTranslation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("emails");
    if (typeof raw !== "string") return;
    onSubmit(parseCommaSeparatedList(raw));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        name="emails"
        defaultValue={currentEmails?.join(", ") ?? ""}
        placeholder={t("integrations.emailPlaceholder")}
        className="input input-sm input-bordered w-full"
      />
      {error && <p className="text-error text-xs">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-xs">
        {isSubmitting ? <Spinner size="xs" /> : currentEmails ? t("integrations.save") : t("integrations.connect")}
      </button>
    </form>
  );
}
