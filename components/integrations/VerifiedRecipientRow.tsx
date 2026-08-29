"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";

// The one row shape EmailConnectForm and SmsConnectForm's recipient lists
// share exactly — a confirmed recipient has nothing left to do but remove
// it. Their *pending* rows differ too much to share (email is just a
// resend link; sms needs a whole code-entry form), so only this one gets
// pulled out.
export default function VerifiedRecipientRow({ value, onRemove }: { value: string; onRemove: () => void }) {
  const { t } = useTranslation();

  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate">{value}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="badge badge-soft badge-success badge-xs">{t("integrations.verified")}</span>
        <button type="button" onClick={onRemove} className="text-error" aria-label={t("integrations.removeRecipient")}>
          ×
        </button>
      </span>
    </li>
  );
}
