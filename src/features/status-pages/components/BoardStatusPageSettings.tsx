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

// Distinct from any real query result (undefined while loading, null when
// no status page row exists yet, or the row itself) — see the
// syncedData/NOT_SYNCED comment below for what this is actually for.
const NOT_SYNCED = Symbol("not-synced");

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
  const [showPassword, setShowPassword] = useState(false);
  const [allowedIpsInput, setAllowedIpsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Adjusting state during render (react.dev's recipe for "reset state
  // when a prop changes"; BoardDetailContent.tsx's own board/syncedBoard
  // pair does the same thing), not an effect — an effect only runs after
  // the first paint. This component remounts fresh per board
  // (StatusPagesPageContent's key={board.id}), and its query result can
  // already be warm in the cache the moment it mounts (shared
  // queryKeys.boards.statusPage(boardId) with the list's own useQueries,
  // which fetches every board's status page up front). An effect-only
  // resync meant the very first render after clicking a different board's
  // card painted the form with these fields still at their hardcoded empty
  // defaults — failing slugSchema's minimum length and flashing a real
  // validation error — before the effect caught up a tick later. The
  // NOT_SYNCED sentinel forces this block to run on that first render too,
  // not just on later changes (a save/enable mutation's setQueryData echo,
  // or the true first-ever load resolving).
  const [syncedData, setSyncedData] = useState<typeof data | typeof NOT_SYNCED>(NOT_SYNCED);
  if (data !== undefined && data !== syncedData) {
    setSyncedData(data);
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
  }

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

  // Shared by the mutation body and the Save button's disabled check below,
  // so "is there anything to save" and "what gets sent" can't drift apart.
  const parsedAllowedIps = allowedIpsInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Grows the allowlist textarea one row per line actually typed (not
  // parsedAllowedIps.length — that drops blank/trimmed lines, which would
  // make the field shrink back out from under someone mid-Enter on a new
  // line), floored at the same 3-row starting height as before, capped at
  // MAX_ALLOWED_IPS so it can never grow past what the server will accept
  // anyway — a 21st line just scrolls inside the fixed-height box instead.
  const allowlistRows = Math.min(Math.max(allowedIpsInput.split("\n").length, 3), MAX_ALLOWED_IPS);

  const allowedIpsMutation = useStatusPageMutation(() =>
    requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/allowed-ips`, t("boards.statusPage.allowlistSaveFailed"), {
      method: "PUT",
      body: { allowedIps: parsedAllowedIps },
    }),
  );

  // Same schemas the server enforces (src/features/status-pages/services/
  // validation.ts) run here too, purely for feedback before a click — the
  // server re-checks everything from scratch regardless, since a client
  // that skipped this file entirely (a hand-edited request) can't be
  // trusted to have run it at all. Password/allowlist errors only show
  // once a field is non-empty (an untouched field isn't "invalid", it's
  // just empty) — but slug always shows its error, empty or not, since it
  // auto-defaults from the board's own name on load (see the resync effect
  // above) and so can only ever go blank via someone actively clearing it,
  // never an untouched initial state to protect against. Company name has
  // no equivalent — slugSchema requires at least 3 characters, but
  // companyNameSchema has no minimum at all (an empty company name is
  // genuinely valid; the server normalizes it to null, see the PUT
  // route), so companyNameError can only ever fire on the max-length rule.
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

  // Save/Publish stay visible but disabled until the slug is actually
  // valid (non-empty, per slugSchema's own minimum) and company name is
  // under its max length — company name has no emptiness requirement here
  // to match, since companyNameSchema genuinely allows it (see the error
  // comment above); requiring it client-side used to silently block Save
  // on a perfectly acceptable empty company name. Slug still bites if
  // someone clears it by hand; it's there so that state can't reach either
  // mutation (both 400 server-side on the same condition anyway).
  const canSave = slugResult.success && companyNameResult.success;

  // Loading and loaded states share nothing visually on purpose: while the
  // query is in flight (or stuck retrying a failed fetch), the card shows
  // only a centered spinner — no board name, no half-built form — so a
  // slow/erroring load never flashes stale-looking content. This owns its
  // own single useQuery rather than a parent gating on a second observer
  // for the same key: mounting a second observer for an already-erroring
  // query triggers TanStack Query's refetch-on-mount, and if a parent then
  // conditionally mounts/unmounts this component based on *that* observer's
  // isLoading, the two feed each other into an infinite mount → refetch →
  // isLoading flips → unmount → isLoading settles → mount → refetch loop.
  // Hit exactly this once already — see AGENTS.md's Failure log.
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

      {/* Right under Save/Publish, not at the bottom of the whole form —
          this is the actual "you're live, here's the link" signal now that
          the redundant "Live" badge next to the section heading is gone
          (see the grilling session in git history); it belongs next to the
          buttons that put it there, not scrolled past every field below.
          Full width of the detail pane, same as the header row above and
          the fields/logo block below (see that block's own comment on why
          it's no longer capped) — min-w-0 + break-all on the link itself is
          what actually prevents overflow, not a narrower box. */}
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

      {/* Full width of the detail pane — same as the header row (board name
          + Save/Publish) above and the link box above that, so the whole
          panel reads as one consistent column width instead of the header
          spanning edge-to-edge while the fields below it sat capped and
          centered narrower (see git history for the max-w-2xl version this
          replaced). No "Public status page" section title above the
          slug/company-name fields — the header row above (board name +
          Save/Publish) and the link box already establish what this panel
          is, and "Privacy" below is the only section that genuinely needs
          its own label (it's a second, distinct group of fields the reader
          could otherwise mistake as continuing the first). No "Live" badge
          either — the Publish/Unpublish button in the header row above
          (label + color) and the link box further down (only rendered once
          published) already say this; a third badge right next to a
          section label was a redundant indicator, not a clearer one. */}
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
                // Every other field here (slug/company name/password) already
                // caps input length via maxLength — this one didn't, which is
                // exactly how a pasted wall of nonsense with no line breaks
                // got in at all. 45 is the longest a real IPv4/IPv6 literal
                // ever gets (e.g. an IPv4-mapped IPv6 address); +1 per line
                // for the newline, times the most lines the server will ever
                // accept.
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
              // break-words, not break-all — this is the one error message
              // in this file that echoes the offending pasted value back
              // (see firstAllowedIpsIssueMessage), so it needs *some*
              // forced-break rule or one long paste overflows the whole
              // card. break-all (word-break: break-all) was the original
              // fix, but it applies to the entire string, including the
              // ordinary English words in the explanatory sentence after
              // the quoted value — it breaks *any* word wherever a line
              // fills up, not just ones that actually need it, so normal
              // words were splitting mid-letter for no reason. break-words
              // (overflow-wrap: break-word) only breaks a word once it
              // genuinely can't fit on its own line, preferring a normal
              // space-based wrap everywhere else — still contains the
              // truncated-at-80-characters echoed value (see
              // firstAllowedIpsIssueMessage) from overflowing, since that's
              // exactly the "can't fit, so break it" case it exists for.
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
