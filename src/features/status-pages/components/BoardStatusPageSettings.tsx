"use client";

import { useEffect, useState } from "react";
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
import StatusPageLogoUpload from "@/features/status-pages/components/StatusPageLogoUpload";
import Spinner from "@/components/Spinner";
import { CopyIcon, CheckIcon } from "@/components/icons/NavIcons";

// Create → configure → publish → share, all in one panel. Bare content
// only, no outer margin/card/sizing — BoardDetailContent's grid owns that
// uniformly across all 6 cells (see its own comment), same convention as
// BoardActiveIncidentsPanel/BoardActiveMaintenancePanel. Kept as its own
// component since it's a self-contained data-fetching unit (its own
// useQuery), not because of any layout need of its own.
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
  const [allowedIpsInput, setAllowedIpsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Resync the draft from the server whenever the query result's identity
  // actually changes — the initial load, or right after a save/enable
  // mutation's setQueryData echoes back what was just persisted. Doesn't
  // fire on every keystroke, only when `data` itself changes.
  useEffect(() => {
    if (data === undefined) return;
    // Intentional resync from the query result's identity, not per
    // keystroke — see the comment above this effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSlug(data?.slug ?? slugify(boardName));
    // Defaults to the board's own name rather than an empty field — a
    // status page with no explicit branding still needs *some* company
    // name to show visitors, and the board's name is the obvious guess.
    // The PUT route already normalizes an explicitly-cleared field to
    // null (never an empty string), so this can't fight a real "no
    // company name" choice on the next resync.
    setCompanyName(data?.companyName ?? boardName);
    setLogoUrl(data?.logoUrl ?? null);
    setHideBranding(data?.hideBranding ?? false);
    // Not passwordInput — the server never returns the actual password, so
    // there's nothing to resync it from; it only ever reflects what the
    // owner is currently typing, cleared on a successful save instead.
    setAllowedIpsInput((data?.allowedIps ?? []).join("\n"));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data, boardName]);

  // Every mutation on this panel shares the same onSuccess (clear the error,
  // echo the persisted row into the query cache) and onError (surface the
  // message) wiring — called a fixed 5 times below, unconditionally, same
  // as any other hook. `onSuccessExtra` covers the one mutation
  // (passwordMutation) that needs an extra side effect on top of the
  // shared behavior.
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

  const allowedIpsMutation = useStatusPageMutation(() =>
    requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/allowed-ips`, t("boards.statusPage.allowlistSaveFailed"), {
      method: "PUT",
      body: {
        allowedIps: allowedIpsInput
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      },
    }),
  );

  const publicPath = data ? `/status/${data.slug}` : null;
  const saving = saveMutation.isPending;
  const publishing = enableMutation.isPending;
  // No row yet (never saved) reads the same as "not published" — Publish
  // itself creates the row via the save-first step below, so a board
  // doesn't need an explicit prior Save before it can go live.
  const isPublished = data?.enabled ?? false;

  // Publishing (unpublished → published) persists the current draft first —
  // enableMutation only ever flips the `enabled` column, so without this an
  // unsaved edit (e.g. just-toggled hideBranding), or a board with no
  // board_status_pages row at all yet, would never reach the database and
  // the public page would keep showing the last-saved state (or 404).
  // Unpublishing needs no save step; it's just turning the page off.
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

  // Save/Publish stay visible but disabled until both are actually filled
  // in — both fields auto-default from the board's own name on load (see
  // the resync effect above), so this only really bites if someone clears
  // one by hand; it's there so that state can't reach either mutation
  // (both 400 server-side on an empty slug/company anyway).
  const canSave = slug.trim().length > 0 && companyName.trim().length > 0;

  return isLoading ? (
    <Spinner size="sm" className="mt-3" />
  ) : (
    <div className="mt-3 flex flex-col gap-3">
      {/* A 2-row grid on md+: row 1 is the two headings ("Public status
          page" and "Privacy"), row 2 is url+company / logo / privacy
          fields — placed by explicit row/col rather than DOM order, so
          mobile (no md: placement at all) can stack in normal reading
          order (heading directly above its own fields) while desktop still
          lines both headings up on the same row. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        <div className="flex items-center justify-between md:col-start-1 md:row-start-1">
          <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("boards.statusPage.title")}</h2>
          {isPublished && <span className="badge badge-success badge-xs">{t("boards.statusPage.live")}</span>}
        </div>

        <div className="flex flex-col gap-3 md:col-start-1 md:row-start-2">
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">{t("boards.statusPage.slugLabel")}</legend>
            <label className="input input-bordered input-sm flex w-full items-center gap-1">
              <span className="text-base-content/40 shrink-0 text-xs whitespace-nowrap">{origin || "…"}/status/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="grow"
                maxLength={63}
              />
            </label>
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
          </fieldset>
        </div>

        {/* No heading of its own — centered in the extra width this column
            has next to the shorter url/company and privacy field blocks. */}
        <div className="flex flex-col items-center gap-2 text-center md:col-start-2 md:row-start-2">
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

        <h3 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase md:col-start-3 md:row-start-1">
          {t("boards.statusPage.privacyTitle")}
        </h3>

        <div className="flex flex-col gap-3 md:col-start-3 md:row-start-2">
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">
              {data?.passwordProtected ? t("boards.statusPage.passwordProtectedLabel") : t("boards.statusPage.passwordLabel")}
            </legend>
            <div className="flex gap-2">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={
                  data?.passwordProtected ? t("boards.statusPage.passwordChangePlaceholder") : t("boards.statusPage.passwordSetPlaceholder")
                }
                className="input input-bordered input-sm w-full"
                maxLength={200}
              />
              <button
                type="button"
                disabled={passwordMutation.isPending || passwordInput.length < 4}
                onClick={() => passwordMutation.mutate()}
                className="btn btn-info btn-xs shrink-0"
              >
                {passwordMutation.isPending ? <Spinner size="xs" /> : t("boards.statusPage.passwordSave")}
              </button>
            </div>
            {data?.passwordProtected && (
              <button
                type="button"
                disabled={removePasswordMutation.isPending}
                onClick={() => removePasswordMutation.mutate()}
                className="btn btn-ghost btn-xs mt-1 self-start"
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
                className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
                rows={3}
              />
              <button
                type="button"
                disabled={allowedIpsMutation.isPending}
                onClick={() => allowedIpsMutation.mutate()}
                className="btn btn-info btn-xs shrink-0 self-end"
              >
                {allowedIpsMutation.isPending ? <Spinner size="xs" /> : t("boards.statusPage.allowlistSave")}
              </button>
            </div>
          </fieldset>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-error text-xs">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" disabled={saving || !canSave} onClick={() => saveMutation.mutate()} className="btn btn-info btn-xs">
          {saving ? <Spinner size="xs" /> : t("boards.statusPage.save")}
        </button>

        <button
          type="button"
          disabled={publishing || saving || !canSave}
          onClick={handleTogglePublish}
          className={`btn btn-xs ${isPublished ? "btn-ghost" : "btn-success"}`}
        >
          {publishing ? <Spinner size="xs" /> : isPublished ? t("boards.statusPage.unpublish") : t("boards.statusPage.publish")}
        </button>
      </div>

      {isPublished && publicPath && (
        <div className="bg-[var(--color-surface-2)] border-base-300 flex items-start gap-2 rounded-lg border p-2">
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
    </div>
  );
}
