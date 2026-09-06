"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson, requestJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/client";
import { useOrigin } from "@/hooks/useOrigin";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { BoardStatusPage } from "@/types/statusPage";
import StatusPageLogoUpload from "@/components/statusPage/StatusPageLogoUpload";
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
    setCompanyName(data?.companyName ?? "");
    setLogoUrl(data?.logoUrl ?? null);
    setHideBranding(data?.hideBranding ?? false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data, boardName]);

  const saveMutation = useMutation({
    mutationFn: () =>
      requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page`, t("boards.statusPage.saveFailed"), {
        method: "PUT",
        body: { slug, companyName, logoUrl, hideBranding },
      }),
    onSuccess: (statusPage) => {
      setError(null);
      queryClient.setQueryData(queryKeys.boards.statusPage(boardId), statusPage);
    },
    onError: (err: Error) => setError(err.message),
  });

  const enableMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      requestJson<BoardStatusPage>(`/api/boards/${boardId}/status-page/enable`, t("boards.statusPage.enableFailed"), {
        method: enabled ? "POST" : "DELETE",
      }),
    onSuccess: (statusPage) => {
      setError(null);
      queryClient.setQueryData(queryKeys.boards.statusPage(boardId), statusPage);
    },
    onError: (err: Error) => setError(err.message),
  });

  const publicPath = data ? `/status/${data.slug}` : null;
  const saving = saveMutation.isPending;
  const publishing = enableMutation.isPending;

  // Publishing (unpublished → published) persists the current draft first —
  // enableMutation only ever flips the `enabled` column, so without this an
  // unsaved edit (e.g. just-toggled hideBranding) would silently never reach
  // the database and the public page would keep showing the last-saved state.
  // Unpublishing needs no save step; it's just turning the page off.
  async function handleTogglePublish() {
    if (!data) return;
    if (!data.enabled) {
      try {
        await saveMutation.mutateAsync();
      } catch {
        return; // saveMutation's onError already surfaced the message
      }
    }
    enableMutation.mutate(!data.enabled);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("boards.statusPage.title")}</h2>
        {data?.enabled && <span className="badge badge-success badge-xs">{t("boards.statusPage.live")}</span>}
      </div>

      {isLoading ? (
        <Spinner size="sm" className="mt-3" />
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend">{t("boards.statusPage.slugLabel")}</legend>
            <label className="input input-bordered input-sm flex items-center gap-1">
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
              placeholder={boardName}
              className="input input-bordered input-sm w-full"
              maxLength={120}
            />
          </fieldset>

          <StatusPageLogoUpload
            supabase={supabase}
            boardId={boardId}
            logoUrl={logoUrl}
            hideBranding={hideBranding}
            onChange={setLogoUrl}
          />

          {!logoUrl && (
            <label className="label cursor-pointer justify-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={hideBranding}
                onChange={(e) => setHideBranding(e.target.checked)}
                className="checkbox checkbox-xs"
              />
              {t("boards.statusPage.hideBranding")}
            </label>
          )}

          {error && <p className="text-error text-xs">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={saving || !slug} onClick={() => saveMutation.mutate()} className="btn btn-info btn-xs">
              {saving ? <Spinner size="xs" /> : t("boards.statusPage.save")}
            </button>

            {data && (
              <button
                type="button"
                disabled={publishing || saving}
                onClick={handleTogglePublish}
                className={`btn btn-xs ${data.enabled ? "btn-ghost" : "btn-success"}`}
              >
                {publishing ? <Spinner size="xs" /> : data.enabled ? t("boards.statusPage.unpublish") : t("boards.statusPage.publish")}
              </button>
            )}
          </div>

          {data?.enabled && publicPath && (
            <div className="bg-base-100 border-base-300 flex items-start gap-2 rounded-lg border p-2">
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
      )}
    </>
  );
}
