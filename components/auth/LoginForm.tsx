"use client";

import { useActionState, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { authenticate } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/NavIcons";

export default function LoginForm() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [state, action, pending] = useActionState(authenticate, undefined);
  const [googlePending, setGooglePending] = useState(false);

  async function handleGoogle() {
    setGooglePending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="card card-border bg-base-200 w-full max-w-sm p-6">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("signIn")}
            className={`btn btn-sm flex-1 ${mode === "signIn" ? "btn-info" : "btn-ghost"}`}
          >
            {t("auth.signIn")}
          </button>
          <button
            type="button"
            onClick={() => setMode("signUp")}
            className={`btn btn-sm flex-1 ${mode === "signUp" ? "btn-info" : "btn-ghost"}`}
          >
            {t("auth.signUp")}
          </button>
        </div>

        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="mode" value={mode} />

          <label className="text-base-content/70 text-xs" htmlFor="email">
            {t("auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input input-bordered w-full"
          />

          <label className="text-base-content/70 text-xs" htmlFor="password">
            {t("auth.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            className="input input-bordered w-full"
          />

          <button type="submit" disabled={pending} className="btn btn-info mt-2">
            {pending ? t("auth.submitting") : mode === "signIn" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        </form>

        {state?.errorCode && (
          <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
            <span>{t(`auth.error.${state.errorCode}`, { defaultValue: t("auth.error.generic") })}</span>
          </div>
        )}
        {state?.message && (
          <div role="alert" className="alert alert-success alert-soft mt-3 py-2 text-xs">
            <span>{t(`auth.message.${state.message}`)}</span>
          </div>
        )}

        <div className="divider text-xs">{t("auth.or")}</div>

        <button type="button" onClick={handleGoogle} disabled={googlePending} className="btn btn-outline gap-2">
          <GoogleIcon />
          {t("auth.continueWithGoogle")}
        </button>
      </div>
    </main>
  );
}
