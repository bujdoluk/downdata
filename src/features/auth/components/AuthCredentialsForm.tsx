"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { EyeIcon, EyeSlashIcon, GoogleIcon } from "@/components/icons/NavIcons";
import Spinner from "@/components/Spinner";

// The login/signup half of LoginForm's card, split out so that file stays
// under this skill's own 200-line threshold — it was handling three modes
// (login/signup/reset) inline. Takes email/password's legend ids as props
// (not useId() here) so LoginForm, which owns the actual <legend> elements
// for the reset-mode form too, is the one place generating them.
export default function AuthCredentialsForm({
  mode,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  rememberMe,
  onRememberMeChange,
  error,
  submitting,
  googleSubmitting,
  onSubmit,
  onForgotPassword,
  onGoogleClick,
  emailLegendId,
  passwordLegendId,
}: {
  mode: "login" | "signup";
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  error: string | null;
  submitting: boolean;
  googleSubmitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onForgotPassword: () => void;
  onGoogleClick: () => void;
  emailLegendId: string;
  passwordLegendId: string;
}) {
  const { t } = useTranslation();

  return (
    <>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <fieldset className="fieldset">
          {/* legend labels the fieldset as a group, not the input inside it
              — aria-labelledby is what actually gives the input a real
              accessible name (a bare <legend> isn't guaranteed to be read
              as the input's label by every screen reader). */}
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
        <fieldset className="fieldset">
          <legend id={passwordLegendId} className="fieldset-legend">
            {t("auth.passwordLabel")}
          </legend>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input input-bordered w-full pr-10"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 6 : undefined}
              aria-labelledby={passwordLegendId}
              required
            />
            <button
              type="button"
              className="text-base-content/50 hover:text-base-content absolute inset-y-0 right-2 flex items-center"
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              onClick={onToggleShowPassword}
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
                onChange={(event) => onRememberMeChange(event.target.checked)}
              />
              {t("auth.rememberMe")}
            </label>
            <button type="button" className="link link-hover text-base-content/60 text-xs" onClick={onForgotPassword}>
              {t("auth.forgotPassword")}
            </button>
          </div>
        )}

        {/* role="alert" — the success states elsewhere in this flow already
            get one; an error is at least as important to announce. */}
        {error && (
          <p role="alert" className="text-error text-sm">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-info mt-1" disabled={submitting || googleSubmitting}>
          {submitting ? <Spinner size="xs" /> : mode === "login" ? t("auth.loginSubmit") : t("auth.signupSubmit")}
        </button>
      </form>

      <div className="divider text-base-content/50 text-xs">{t("auth.orDivider")}</div>

      <button type="button" className="btn btn-outline gap-2" disabled={googleSubmitting || submitting} onClick={onGoogleClick}>
        {googleSubmitting ? <Spinner size="xs" /> : <GoogleIcon />}
        {t("auth.googleContinue")}
      </button>
    </>
  );
}
