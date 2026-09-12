"use client";

import { Suspense } from "react";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { ArrowLeftIcon } from "@/components/icons/NavIcons";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import AuthCredentialsForm from "@/features/auth/components/AuthCredentialsForm";
import AuthResetRequestForm from "@/features/auth/components/AuthResetRequestForm";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

function LoginForm() {
  const { t } = useTranslation();
  const {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    submitting,
    googleSubmitting,
    error,
    confirmEmailSent,
    resetLinkSent,
    switchMode,
    handleSubmit,
    handleResetSubmit,
    handleGoogle,
    handleGoBack,
    resetEmailLegendId,
    emailLegendId,
    passwordLegendId,
  } = useLoginForm();

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
                <AuthResetRequestForm
                  email={email}
                  onEmailChange={setEmail}
                  error={error}
                  submitting={submitting}
                  onSubmit={handleResetSubmit}
                  emailLegendId={resetEmailLegendId}
                />
              )
            ) : confirmEmailSent ? (
              <div role="alert" className="alert alert-success alert-soft mt-4 py-2 text-xs">
                <span>{t("auth.confirmEmailSent")}</span>
              </div>
            ) : (
              <AuthCredentialsForm
                mode={mode}
                email={email}
                onEmailChange={setEmail}
                password={password}
                onPasswordChange={setPassword}
                showPassword={showPassword}
                onToggleShowPassword={() => setShowPassword((value) => !value)}
                rememberMe={rememberMe}
                onRememberMeChange={setRememberMe}
                error={error}
                submitting={submitting}
                googleSubmitting={googleSubmitting}
                onSubmit={handleSubmit}
                onForgotPassword={() => switchMode("reset")}
                onGoogleClick={handleGoogle}
                emailLegendId={emailLegendId}
                passwordLegendId={passwordLegendId}
              />
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
              onClick={handleGoBack}
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

// Skeleton, not a blank flash, while useSearchParams() (which requires this
// Suspense boundary in the App Router) resolves — usually near-instant, but
// a "missing loading state" either way.
function LoginFormSkeleton() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6" aria-busy="true" aria-label="Loading">
      <div className="card card-border bg-base-200 h-80 w-full max-w-sm animate-pulse" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
