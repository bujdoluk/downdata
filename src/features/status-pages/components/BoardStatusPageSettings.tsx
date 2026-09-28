"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson, requestJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/client";
import { useOrigin } from "@/features/status-pages/hooks/useOrigin";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { BoardStatusPage } from "@/features/status-pages/types";
import {
  allowedIpsSchema,
  companyNameSchema,
  firstAllowedIpsIssueMessage,
  firstIssueMessage,
  MAX_ALLOWED_IPS,
  passwordSchema,
  slugSchema,
} from "@/features/status-pages/services/validation";
import StatusPageLogoUpload from "@/features/status-pages/components/StatusPageLogoUpload";
import Spinner from "@/components/Spinner";
import { CopyIcon, CheckIcon, EyeIcon, EyeSlashIcon } from "@/components/icons/NavIcons";

// Distinct from every real query result (undefined, null, or a row).
const NOT_SYNCED = Symbol("not-synced");

// Bare content, no outer card/sizing: BoardDetailContent's grid owns that.
export default function BoardStatusPageSettings({ boardId, boardName }: { boardId: string; boardName: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [supabase] = useState(() => createClient());
  const origin = useOrigin();
  const { copied, copy } = useCopyToClipboard();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.boards.statusPage(boardId),
    queryFn: () => fetchJson<BoardStatusPage | null>(`/api/boards/${boardId}/status-page`),
  });

  const [slug, setSlug] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hideBranding, setHideBranding] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [allowedIpsInput, setAllowedIpsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Synced during render, not in an effect: a warm cache would otherwise paint
  // empty defaults first and flash a slug validation error. NOT_SYNCED forces the first sync.
  const [syncedData, setSyncedData] = useState<typeof data | typeof NOT_SYNCED>(NOT_SYNCED);
  if (data !== undefined && data !== syncedData) {
    setSyncedData(data);
    setSlug(data?.slug ?? slugify(boardName));
    setCompanyName(data?.companyName ?? boardName);
    setLogoUrl(data?.logoUrl ?? null);
    setHideBranding(data?.hideBranding ?? false);
    // passwordInput isn't resynced: the server never returns the password.
    setAllowedIpsInput((data?.allowedIps ?? []).join("\n"));
  }

  function useStatusPageMutation<TVariables = void>(
    mutationFn: (variables: TVariables) => Promise<BoardStatusPage>,
    onSuccessExtra?: (statusPage: BoardStatusPage) => void,
  ) {
    return useMutation({
      mutationFn,
      onSuccess: (statusPage) => {
        setError(null);
        onSuccessExtra?.(statusPage);
        queryClient.setQueryData(queryKeys.boards.statusPage(boardId), statusPage);
      },
      onError: (err: Error) => setError(err.message),
    });
  }

  const saveMutation = useStatusPageMutation(() =>
    requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page`, t("boards.statusPage.saveFailed"), {
      method: "PUT",
      body: { slug, companyName, logoUrl, hideBranding },
    }),
  );

  const enableMutation = useStatusPageMutation((enabled: boolean) =>
    requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/enable`, t("boards.statusPage.enableFailed"), {
      method: enabled ? "POST" : "DELETE",
    }),
  );

  const passwordMutation = useStatusPageMutation(
    () =>
      requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/password`, t("boards.statusPage.passwordSaveFailed"), {
        method: "PUT",
        body: { password: passwordInput },
      }),
    () => setPasswordInput(""),
  );

  const removePasswordMutation = useStatusPageMutation(() =>
    requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/password`, t("boards.statusPage.passwordRemoveFailed"), {
      method: "DELETE",
    }),
  );

  // Shared by the mutation body and Save's disabled check so they can't drift.
  const parsedAllowedIps = allowedIpsInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Counts raw lines, not parsedAllowedIps, so the box doesn't shrink mid-Enter on a blank line.
  const allowlistRows = Math.min(Math.max(allowedIpsInput.split("\n").length, 3), MAX_ALLOWED_IPS);

  const allowedIpsMutation = useStatusPageMutation(() =>
    requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/allowed-ips`, t("boards.statusPage.allowlistSaveFailed"), {
      method: "PUT",
      body: { allowedIps: parsedAllowedIps },
    }),
  );

  // Client-side feedback only; the server re-validates. Slug errors show even when
  // empty since it auto-defaults, so blank means someone cleared it.
  const slugResult = slugSchema.safeParse(slug);
  const slugError = firstIssueMessage(slugResult);
  const companyNameResult = companyNameSchema.safeParse(companyName);
  const companyNameError = firstIssueMessage(companyNameResult);
  const passwordResult = passwordInput.length > 0 ? passwordSchema.safeParse(passwordInput) : null;
  const passwordError = passwordResult ? firstIssueMessage(passwordResult) : null;
  const allowedIpsResult = parsedAllowedIps.length > 0 ? allowedIpsSchema.safeParse(parsedAllowedIps) : null;
  const allowedIpsError = allowedIpsResult ? firstAllowedIpsIssueMessage(allowedIpsResult, parsedAllowedIps) : null;

  const publicPath = data ? `/status/${data.slug}` : null;
  const saving = saveMutation.isPending;
  const publishing = enableMutation.isPending;
  const isPublished = data?.enabled ?? false;

  // Publish saves first: enable only flips `enabled`, so unsaved edits (or a missing row) would never go live.
  async function handleTogglePublish() {
    if (!isPublished) {
      try {
        await saveMutation.mutateAsync();
      } catch {
        return; // saveMutation's onError already surfaced the message
      }
    }
    enableMutation.mutate(!isPublished);
  }

  // An empty company name is valid (server stores null), so only its max length gates Save.
  const canSave = slugResult.success && companyNameResult.success;

  // Loading UI lives here, not in a parent gating on a second observer of this key:
  // that caused an infinite mount/refetch loop (see AGENTS.md Failure log).
  return isLoading ? (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3">
      <Spinner size="xl" />
      <p className="text-base-content/50 text-sm">{t("boards.statusPage.loading")}</p>
    </div>
  ) : (
    <div className="flex min-h-64 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base-content text-sm font-semibold">{boardName}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={saving || !canSave} onClick={() => saveMutation.mutate()} className="btn btn-info btn-xs w-20">
            {saving ? <Spinner size="xs" /> : t("boards.statusPage.save")}
          </button>

          <button
            type="button"
            disabled={publishing || saving || !canSave}
            onClick={handleTogglePublish}
            className={`btn btn-xs w-20 ${isPublished ? "btn-error btn-outline" : "btn-success"}`}
          >
            {publishing ? <Spinner size="xs" /> : isPublished ? t("boards.statusPage.unpublish") : t("boards.statusPage.publish")}
          </button>
        </div>
      </div>

      {isPublished && publicPath && (
        <div className="bg-[var(--color-surface-2)] border-base-300 flex w-full items-start gap-2 rounded-lg border p-2">
          <a href={publicPath} target="_blank" rel="noreferrer" className="link link-hover min-w-0 flex-1 break-all text-xs">
            {origin}
            {publicPath}
          </a>
          <button
            type="button"
            onClick={() => copy(`${origin}${publicPath}`)}
            className="btn btn-ghost btn-xs"
            aria-label={t("boards.statusPage.copyLink")}
          >
            {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
          </button>
        </div>
      )}

      <div className="flex w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <fieldset className="fieldset py-0">
              <legend className="fieldset-legend">{t("boards.statusPage.slugLabel")}</legend>
              <label className="input input-bordered input-sm flex w-full items-center gap-1">
                <span className="text-base-content/40 shrink-0 text-xs whitespace-nowrap">{origin || "…"}/status/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="grow"
                  maxLength={100}
                />
              </label>
              {slugError && (
                <p role="alert" className="text-error text-xs break-words">
                  {slugError}
                </p>
              )}
            </fieldset>

            <fieldset className="fieldset py-0">
              <legend className="fieldset-legend">{t("boards.statusPage.companyNameLabel")}</legend>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("boards.statusPage.companyNamePlaceholder")}
                className="input input-bordered input-sm w-full"
                maxLength={120}
              />
              {companyNameError && (
                <p role="alert" className="text-error text-xs break-words">
                  {companyNameError}
                </p>
              )}
            </fieldset>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <StatusPageLogoUpload
              supabase={supabase}
              boardId={boardId}
              logoUrl={logoUrl}
              hideBranding={hideBranding}
              onChange={setLogoUrl}
            />

            {!logoUrl && (
              <label className="label cursor-pointer justify-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={hideBranding}
                  onChange={(e) => setHideBranding(e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                {t("boards.statusPage.hideBranding")}
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
          <h3 className="col-span-1 text-base-content/40 text-xs font-semibold tracking-wide uppercase md:col-span-2">
            {t("boards.statusPage.privacyTitle")}
          </h3>

          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">
              {data?.passwordProtected ? t("boards.statusPage.passwordProtectedLabel") : t("boards.statusPage.passwordLabel")}
            </legend>
            <div className="flex gap-2">
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={
                    data?.passwordProtected ? t("boards.statusPage.passwordChangePlaceholder") : t("boards.statusPage.passwordSetPlaceholder")
                  }
                  className="input input-bordered input-sm w-full pr-8"
                  maxLength={64}
                />
                <button
                  type="button"
                  className="text-base-content/50 hover:text-base-content absolute inset-y-0 right-2 flex cursor-pointer items-center"
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              <button
                type="button"
                disabled={passwordMutation.isPending || !passwordResult?.success}
                onClick={() => passwordMutation.mutate()}
                className="btn btn-info btn-xs w-20 shrink-0"
              >
                {passwordMutation.isPending ? <Spinner size="xs" /> : t("boards.statusPage.passwordSave")}
              </button>
            </div>
            {passwordError && (
              <p role="alert" className="text-error text-xs break-words">
                {passwordError}
              </p>
            )}
            {data?.passwordProtected && (
              <button
                type="button"
                disabled={removePasswordMutation.isPending}
                onClick={() => removePasswordMutation.mutate()}
                className="btn btn-error btn-outline btn-xs mt-1 self-start"
              >
                {removePasswordMutation.isPending ? <Spinner size="xs" /> : t("boards.statusPage.passwordRemove")}
              </button>
            )}
          </fieldset>

          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">{t("boards.statusPage.allowlistLabel")}</legend>
            <div className="flex gap-2">
              <textarea
                value={allowedIpsInput}
                onChange={(e) => setAllowedIpsInput(e.target.value)}
                placeholder={t("boards.statusPage.allowlistPlaceholder")}
                className="textarea textarea-bordered textarea-sm w-full min-w-0 max-w-full font-mono text-xs break-all"
                rows={allowlistRows}
                // 45 = longest IPv4/IPv6 literal, +1 for the newline, per allowed line.
                maxLength={(45 + 1) * MAX_ALLOWED_IPS}
              />
              <button
                type="button"
                disabled={allowedIpsMutation.isPending || parsedAllowedIps.length === 0 || !allowedIpsResult?.success}
                onClick={() => allowedIpsMutation.mutate()}
                className="btn btn-info btn-xs w-20 shrink-0 self-start"
              >
                {allowedIpsMutation.isPending ? <Spinner size="xs" /> : t("boards.statusPage.allowlistSave")}
              </button>
            </div>
            {allowedIpsError && (
              // break-words, not break-all: only the echoed value needs force-breaking, not the prose.
              <p role="alert" className="text-error text-xs break-words">
                {allowedIpsError}
              </p>
            )}
          </fieldset>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-error text-xs break-words">
          {error}
        </p>
      )}
    </div>
  );
}
