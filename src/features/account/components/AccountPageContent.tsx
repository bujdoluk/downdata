"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import AvatarUpload from "@/components/account/AvatarUpload";
import TimeZonePicker from "@/components/account/TimeZonePicker";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import Spinner from "@/components/Spinner";
import { UserIcon } from "@/components/icons/NavIcons";
import { createClient } from "@/lib/supabase/client";
import { AuthActionError, logOut, updatePassword } from "@/lib/supabase/auth";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@/lib/formatTime";
import { TAB_BG_STYLE } from "@/lib/utils";
import type { Account } from "@/types/account";

export default function AccountPageContent({
  userId,
  email,
  avatarUrl: initialAvatarUrl,
  timeZone: initialTimeZone,
  createdAt,
  lastSignInAt,
  provider,
  boardCount,
  trackedCount,
  integrationCount,
}: {
  userId: string;
  email: string;
  avatarUrl: string | null;
  timeZone: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  provider: string;
  boardCount: number;
  trackedCount: number;
  integrationCount: number;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [supabase] = useState(() => createClient());
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [timeZone, setTimeZone] = useState(initialTimeZone);

  const isPasswordAccount = provider === "email";

  function handleAvatarChange(nextAvatarUrl: string | null) {
    setAvatarUrl(nextAvatarUrl);
    // Keeps the Sidebar's own avatar trigger (a separate mounted instance
    // reading the same query key) in sync without it having to refetch.
    queryClient.setQueryData<Account | null>(queryKeys.account(), (prev) => (prev ? { ...prev, avatarUrl: nextAvatarUrl } : prev));
  }

  function handleTimeZoneChange(nextTimeZone: string) {
    setTimeZone(nextTimeZone);
    // Same sync as handleAvatarChange — every useTimeZone() consumer
    // reads this same cache entry, so this updates every open page's
    // formatted times immediately, no refetch.
    queryClient.setQueryData<Account | null>(queryKeys.account(), (prev) => (prev ? { ...prev, timeZone: nextTimeZone } : prev));
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="card card-border bg-base-200">
        <div className="card-body">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <div className="avatar">
                <div className="w-16 rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage/OAuth avatar URL, not a fixed set of domains next/image can allowlist */}
                  <img src={avatarUrl} alt="" />
                </div>
              </div>
            ) : (
              <div className="avatar avatar-placeholder">
                <div className="bg-neutral text-neutral-content w-16 rounded-full">
                  <UserIcon className="h-8 w-8" />
                </div>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{email}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Radio-input tabs: selection is pure CSS (:checked + sibling
          selector), which only works with each tab-content as the
          immediate next sibling of its own radio — so both panels stay
          mounted, no React state needed to switch between them. */}
      <div role="tablist" className="tabs tabs-lift">
        <input type="radio" name="accountTabs" className="tab" aria-label={t("account.detailsTitle")} style={TAB_BG_STYLE} defaultChecked />
        <div className="tab-content bg-base-200 border-base-300 p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-base-content/60">{t("account.email")}</dt>
            <dd>{email}</dd>
            <dt className="text-base-content/60">{t("account.memberSince")}</dt>
            <dd>{createdAt ? formatDateTime(createdAt, timeZone) : "—"}</dd>
            <dt className="text-base-content/60">{t("account.lastSignIn")}</dt>
            <dd>{lastSignInAt ? formatDateTime(lastSignInAt, timeZone) : "—"}</dd>
          </dl>

          {isPasswordAccount && (
            <div className="mt-6">
              <PasswordSection supabase={supabase} />
            </div>
          )}

          <div className="mt-6">
            <DangerZone supabase={supabase} email={email} />
          </div>
        </div>

        <input type="radio" name="accountTabs" className="tab" aria-label={t("nav.preferences")} style={TAB_BG_STYLE} />
        <div className="tab-content bg-base-200 border-base-300 p-6">
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{t("nav.theme")}</h2>
            <div className="mt-2">
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{t("nav.language")}</h2>
            <div className="mt-2">
              <LanguageSwitcher inline />
            </div>
          </div>

          <div className="mt-4">
            <AvatarUpload supabase={supabase} userId={userId} avatarUrl={avatarUrl} onChange={handleAvatarChange} />
          </div>

          <div className="mt-4">
            <h2 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{t("nav.timezone")}</h2>
            <div className="mt-2">
              <TimeZonePicker supabase={supabase} timeZone={timeZone} onChange={handleTimeZoneChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="stats stats-vertical sm:stats-horizontal bg-base-200 border-base-300 w-full border shadow-sm">
        <Link href="/boards" className="stat py-3 transition-colors hover:bg-base-300/40">
          <div className="stat-title text-xs">{t("account.statsBoards")}</div>
          <div className="stat-value text-3xl">{boardCount}</div>
        </Link>
        <Link href="/monitors" className="stat py-3 transition-colors hover:bg-base-300/40">
          <div className="stat-title text-xs">{t("account.statsTrackedServices")}</div>
          <div className="stat-value text-3xl">{trackedCount}</div>
        </Link>
        <Link href="/integrations" className="stat py-3 transition-colors hover:bg-base-300/40">
          <div className="stat-title text-xs">{t("account.statsIntegrations")}</div>
          <div className="stat-value text-3xl">{integrationCount}</div>
        </Link>
      </div>
    </div>
  );
}

function PasswordSection({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await updatePassword(supabase, password);
      setPassword("");
      setSuccess(true);
    } catch (err) {
      const code = err instanceof AuthActionError ? err.code : "generic";
      setError(t(`auth.errors.${code}`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{t("account.passwordTitle")}</h2>
      <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
        <fieldset className="fieldset flex-1">
          <legend className="fieldset-legend">{t("account.passwordLabel")}</legend>
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
        <button type="submit" className="btn btn-info" disabled={submitting}>
          {submitting ? <Spinner size="xs" /> : t("account.passwordSubmit")}
        </button>
      </form>
      {error && <p className="text-error mt-2 text-sm">{error}</p>}
      {success && <p className="text-success mt-2 text-sm">{t("account.passwordSuccess")}</p>}
    </div>
  );
}

function DangerZone({ supabase, email }: { supabase: ReturnType<typeof createClient>; email: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("account.deleteFailed"));
    },
    onSuccess: async () => {
      await logOut(supabase);
      router.push("/login");
    },
    onError: (err: Error) => setError(err.message),
  });

  function openConfirm() {
    setConfirmEmail("");
    setError(null);
    confirmRef.current?.showModal();
  }

  return (
    <div>
      <h2 className="text-xs font-semibold tracking-wide text-error/80 uppercase">{t("account.dangerZoneTitle")}</h2>
      <p className="text-base-content/60 mt-2 text-sm">{t("account.deleteAccountWarning")}</p>
      <button type="button" onClick={openConfirm} className="btn btn-error btn-outline btn-sm mt-3">
        {t("account.deleteAccount")}
      </button>

      <dialog ref={confirmRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("account.deleteConfirmTitle")}</h3>
          <p className="text-base-content/70 mt-2 text-sm">{t("account.deleteConfirmMessage")}</p>

          <fieldset className="fieldset mt-4">
            <legend className="fieldset-legend">{t("account.deleteConfirmEmailLabel", { email })}</legend>
            <input
              type="text"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              className="input input-bordered w-full"
              autoComplete="off"
            />
          </fieldset>

          {error && <p className="text-error mt-2 text-sm">{error}</p>}

          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                {t("account.cancel")}
              </button>
              <button
                type="button"
                disabled={confirmEmail !== email || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="btn btn-error btn-sm"
              >
                {deleteMutation.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner size="xs" />
                    {t("account.deleting")}
                  </span>
                ) : (
                  t("account.deleteAccount")
                )}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("account.cancel")}</button>
        </form>
      </dialog>
    </div>
  );
}
