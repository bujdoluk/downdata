"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthActionError, continueWithGoogle, logIn, resetPassword, signUp } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { hasNavigatedClientSide } from "@/lib/clientNavigationTracker";
import { forgetSessionOnBrowserClose } from "@/features/auth/services/rememberMe";

export type AuthMode = "login" | "signup" | "reset";

// All of LoginForm's state and handlers, pulled out of the render — the
// component itself was pushing 250+ lines handling all three modes
// (login/signup/reset) inline, this skill's own File Structure guidance
// ("use-task-list.ts — custom hook, if complex state") applied.
export function useLoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/boards";
  const errorParam = searchParams.get("error");

  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<AuthMode>(() => {
    // An expired recovery link drops the user straight back into the reset
    // form instead of the login form — the obvious next action after a
    // failed reset, rather than making them click "Forgot password?" again.
    if (errorParam === "expired") return "reset";
    return searchParams.get("mode") === "signup" ? "signup" : "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "expired"
      ? t("auth.errors.linkExpired")
      : errorParam === "auth"
        ? t("auth.errors.generic")
        : null,
  );
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const resetEmailLegendId = useId();
  const emailLegendId = useId();
  const passwordLegendId = useId();

  function switchMode(nextMode: AuthMode) {
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
        // refresh() before push(), not after — this page's own navbar
        // (LandingNavbar) links to `next`-shaped destinations like /boards,
        // which Next prefetches while still logged out. Without
        // invalidating that cache first, push(next) can silently reuse the
        // stale, pre-login prefetch (a "no session, redirect to /login"
        // response) and bounce a just-authenticated user straight back to
        // /login despite the sign-in actually succeeding.
        router.refresh();
        router.push(next);
      } else {
        const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
        const loggedIn = await signUp(supabase, email, password, redirectTo);
        if (loggedIn) {
          // Same stale-prefetch reasoning as the login branch above.
          router.refresh();
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

  // "Wherever you came from, with a direct-visit fallback" — the same
  // reasoning AboutContent.tsx/SupportContent.tsx/BackLink use elsewhere.
  // /login is most commonly reached via proxy.ts redirecting a signed-out
  // visitor away from a protected page, not by clicking a link on this
  // site — a plain router.back() there can send them right back to that
  // same protected page, which immediately redirects to /login again.
  function handleGoBack() {
    if (hasNavigatedClientSide()) {
      router.back();
    } else {
      router.push("/landing-page");
    }
  }

  return {
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
  };
}
