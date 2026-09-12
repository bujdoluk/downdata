"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { EyeIcon, EyeSlashIcon } from "@/components/icons/NavIcons";
import { AuthActionError, updatePassword } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const passwordLegendId = useId();
  const confirmPasswordLegendId = useId();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.errors.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(supabase, password);
      setSuccess(true);
      setTimeout(() => router.push("/boards"), 1500);
    } catch (err) {
      const code = err instanceof AuthActionError ? err.code : "generic";
      setError(t(`auth.errors.${code}`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="card card-border bg-base-200 w-full max-w-sm">
        <div className="card-body">
          <h1 className="text-center text-xl font-bold">{t("resetPassword.title")}</h1>
          <p className="text-base-content/70 text-center text-sm">{t("resetPassword.subtitle")}</p>

          {success ? (
            <div role="alert" className="alert alert-success alert-soft mt-4 py-2 text-xs">
              <span>{t("resetPassword.success")}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <fieldset className="fieldset">
                <legend id={passwordLegendId} className="fieldset-legend">
                  {t("resetPassword.passwordLabel")}
                </legend>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    aria-labelledby={passwordLegendId}
                    required
                  />
                  <button
                    type="button"
                    className="text-base-content/50 hover:text-base-content absolute inset-y-0 right-2 flex items-center"
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend id={confirmPasswordLegendId} className="fieldset-legend">
                  {t("resetPassword.confirmPasswordLabel")}
                </legend>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  aria-labelledby={confirmPasswordLegendId}
                  required
                />
              </fieldset>

              {error && (
                <p role="alert" className="text-error text-sm">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-info mt-1" disabled={submitting}>
                {submitting ? <Spinner size="xs" /> : t("resetPassword.submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
