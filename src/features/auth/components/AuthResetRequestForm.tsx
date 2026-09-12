"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Spinner from "@/components/Spinner";

// The "forgot password" request form (email only) — split out alongside
// AuthCredentialsForm so LoginForm itself stays under this skill's 200-line
// threshold, having previously handled all three modes inline.
export default function AuthResetRequestForm({
  email,
  onEmailChange,
  error,
  submitting,
  onSubmit,
  emailLegendId,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  emailLegendId: string;
}) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <fieldset className="fieldset">
        <legend id={emailLegendId} className="fieldset-legend">
          {t("auth.emailLabel")}
        </legend>
        <input
          type="email"
          className="input input-bordered w-full"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          autoComplete="email"
          aria-labelledby={emailLegendId}
          required
        />
      </fieldset>

      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-info mt-1" disabled={submitting}>
        {submitting ? <Spinner size="xs" /> : t("auth.resetSubmit")}
      </button>
    </form>
  );
}
