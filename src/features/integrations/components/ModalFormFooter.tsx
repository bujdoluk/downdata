"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";

// Shared by Email/Sms/WebhookConnectForm's own <form> — was copy-pasted
// identically into all three (including this same comment explaining why
// it isn't daisyUI's .modal-action). That class is justify-content:
// flex-end, which clusters both buttons on the right; Cancel/Add at
// opposite edges needs an explicit justify-between instead.
export default function ModalFormFooter({
  onCancel,
  submitLabel,
  isSubmitting,
}: {
  onCancel: () => void;
  submitLabel: ReactNode;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-6 flex items-center justify-between">
      <button type="button" onClick={onCancel} className="btn btn-sm">
        {t("integrations.cancel")}
      </button>
      <button type="submit" disabled={isSubmitting} className="btn btn-info btn-sm">
        {isSubmitting ? <Spinner size="xs" /> : submitLabel}
      </button>
    </div>
  );
}
