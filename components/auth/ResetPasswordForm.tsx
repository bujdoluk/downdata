"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { AuthActionError, updatePassword } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
                <legend className="fieldset-legend">{t("resetPassword.passwordLabel")}</legend>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </fieldset>

              {error && <p className="text-error text-sm">{error}</p>}

              <button type="submit" className="btn btn-info mt-1" disabled={submitting}>
                {submitting ? <span className="loading loading-spinner loading-xs" /> : t("resetPassword.submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
