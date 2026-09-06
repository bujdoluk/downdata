"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon, GoogleIcon } from "@/components/icons/NavIcons";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import { AuthActionError, continueWithGoogle, logIn, resetPassword, signUp } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { forgetSessionOnBrowserClose } from "@/lib/supabase/rememberMe";
import Spinner from "@/components/Spinner";

type Mode = "login" | "signup" | "reset";

function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/boards";

  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<Mode>(() => (searchParams.get("mode") === "signup" ? "signup" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth" ? t("auth.errors.generic") : null,
  );
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setConfirmEmailSent(false);
    setResetLinkSent(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await logIn(supabase, email, password);
        if (!rememberMe) forgetSessionOnBrowserClose();
        router.push(next);
      } else {
        const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
        const loggedIn = await signUp(supabase, email, password, redirectTo);
        if (loggedIn) {
          router.push(next);
        } else {
          setConfirmEmailSent(true);
        }
      }
    } catch (err) {
      const code = err instanceof AuthActionError ? err.code : "generic";
      setError(t(`auth.errors.${code}`));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`;
      await resetPassword(supabase, email, redirectTo);
      setResetLinkSent(true);
    } catch (err) {
      const code = err instanceof AuthActionError ? err.code : "generic";
      setError(t(`auth.errors.${code}`));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      await continueWithGoogle(supabase, redirectTo);
    } catch {
      setError(t("auth.errors.generic"));
      setGoogleSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="card card-border bg-base-200 w-full max-w-sm">
          <div className="card-body">
            <h1 className="text-center text-xl font-bold">
              {mode === "login" && t("auth.loginTitle")}
              {mode === "signup" && t("auth.signupTitle")}
              {mode === "reset" && t("auth.resetTitle")}
            </h1>
            <p className="text-base-content/70 text-center text-sm">
              {mode === "login" && t("auth.loginSubtitle")}
              {mode === "signup" && t("auth.signupSubtitle")}
              {mode === "reset" && t("auth.resetSubtitle")}
            </p>

            {mode === "reset" ? (
              resetLinkSent ? (
                <div role="alert" className="alert alert-success alert-soft mt-4 py-2 text-xs">
                  <span>{t("auth.resetLinkSent")}</span>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="mt-4 flex flex-col gap-3">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">{t("auth.emailLabel")}</legend>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </fieldset>

                  {error && <p className="text-error text-sm">{error}</p>}

                  <button type="submit" className="btn btn-info mt-1" disabled={submitting}>
                    {submitting ? <Spinner size="xs" /> : t("auth.resetSubmit")}
                  </button>
                </form>
              )
            ) : confirmEmailSent ? (
              <div role="alert" className="alert alert-success alert-soft mt-4 py-2 text-xs">
                <span>{t("auth.confirmEmailSent")}</span>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">{t("auth.emailLabel")}</legend>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">{t("auth.passwordLabel")}</legend>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="input input-bordered w-full pr-10"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        minLength={mode === "signup" ? 6 : undefined}
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

                  {mode === "login" && (
                    <div className="-mt-2 flex items-center justify-between">
                      <label className="label cursor-pointer gap-2 p-0 text-xs">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={rememberMe}
                          onChange={(event) => setRememberMe(event.target.checked)}
                        />
                        {t("auth.rememberMe")}
                      </label>
                      <button
                        type="button"
                        className="link link-hover text-base-content/60 text-xs"
                        onClick={() => switchMode("reset")}
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                  )}

                  {error && <p className="text-error text-sm">{error}</p>}

                  <button type="submit" className="btn btn-info mt-1" disabled={submitting || googleSubmitting}>
                    {submitting ? (
                      <Spinner size="xs" />
                    ) : mode === "login" ? (
                      t("auth.loginSubmit")
                    ) : (
                      t("auth.signupSubmit")
                    )}
                  </button>
                </form>

                <div className="divider text-base-content/50 text-xs">{t("auth.orDivider")}</div>

                <button
                  type="button"
                  className="btn btn-outline gap-2"
                  disabled={googleSubmitting || submitting}
                  onClick={handleGoogle}
                >
                  {googleSubmitting ? <Spinner size="xs" /> : <GoogleIcon />}
                  {t("auth.googleContinue")}
                </button>
              </>
            )}

            <p className="mt-4 text-center text-sm">
              {mode === "reset" ? (
                <button type="button" className="link link-info font-medium" onClick={() => switchMode("login")}>
                  {t("auth.backToLogin")}
                </button>
              ) : (
                <Trans
                  i18nKey={mode === "login" ? "auth.switchToSignup" : "auth.switchToLogin"}
                  components={{
                    switchLink: (
                      <button
                        type="button"
                        className="link link-info font-medium"
                        onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                      />
                    ),
                  }}
                />
              )}
            </p>

            <button
              type="button"
              onClick={() => router.back()}
              className="link link-hover text-base-content/60 mt-2 flex items-center justify-center gap-1 text-center text-sm"
            >
              <ArrowLeftIcon />
              {t("auth.goBack")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
