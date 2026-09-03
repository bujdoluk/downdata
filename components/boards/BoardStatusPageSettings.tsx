"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { slugify } from "@/lib/slugify";
import { createClient } from "@/lib/supabase/client";
import type { BoardStatusPage } from "@/types/statusPage";
import StatusPageLogoUpload from "@/components/statusPage/StatusPageLogoUpload";
import Spinner from "@/components/Spinner";
import { CopyIcon, CheckIcon, RadarIcon } from "@/components/icons/NavIcons";

// Create → configure → publish → share, all in one collapsible panel on
// the board detail page. Kept out of BoardDetailContent's own file since
// it's a self-contained data-fetching unit (its own useQuery), same
// reasoning as BoardActiveIncidentsPanel/BoardTrackedServicesGrid.
export default function BoardStatusPageSettings({ boardId, boardName }: { boardId: string; boardName: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [supabase] = useState(() => createClient());
  const [origin, setOrigin] = useState(""); // filled client-side only — window isn't available during SSR

  useEffect(() => {
    // window isn't available during SSR — this can only run post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.boards.statusPage(boardId),
    queryFn: () => fetchJson<BoardStatusPage | null>(`/api/boards/${boardId}/status-page`),
  });

  const [slug, setSlug] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hideBranding, setHideBranding] = useState(false);
  const [copied, setCopied] = useState(false);
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
    mutationFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/status-page`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, companyName, logoUrl, hideBranding }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? t("boards.statusPage.saveFailed"));
      return body as BoardStatusPage;
    },
    onSuccess: (statusPage) => {
      setError(null);
      queryClient.setQueryData(queryKeys.boards.statusPage(boardId), statusPage);
    },
    onError: (err: Error) => setError(err.message),
  });

  const enableMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(`/api/boards/${boardId}/status-page/enable`, { method: enabled ? "POST" : "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? t("boards.statusPage.enableFailed"));
      return body as BoardStatusPage;
    },
    onSuccess: (statusPage) => {
      setError(null);
      setCopied(false);
      queryClient.setQueryData(queryKeys.boards.statusPage(boardId), statusPage);
    },
    onError: (err: Error) => setError(err.message),
  });

  const publicPath = data ? `/status/${data.slug}` : null;
  const saving = saveMutation.isPending;
  const publishing = enableMutation.isPending;

  async function handleCopy() {
    if (!publicPath) return;
    try {
      await navigator.clipboard.writeText(`${origin}${publicPath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — clipboard access can be denied by the browser; the URL is
      // still shown as plain text for a manual copy
    }
  }

  return (
    <div className="collapse collapse-arrow border-base-300 bg-base-200 mt-6 border">
      <input type="checkbox" />
      <div className="collapse-title flex items-center gap-2 font-semibold">
        <RadarIcon className="text-base-content/60" />
        {t("boards.statusPage.title")}
        {data?.enabled && <span className="badge badge-success badge-xs">{t("boards.statusPage.live")}</span>}
      </div>
      <div className="collapse-content">
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <p className="text-base-content/60 text-sm">{t("boards.statusPage.description")}</p>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">{t("boards.statusPage.slugLabel")}</legend>
              <label className="input input-bordered flex items-center gap-1">
                <span className="text-base-content/40 text-sm whitespace-nowrap">{origin || "…"}/status/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="grow"
                  maxLength={63}
                />
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">{t("boards.statusPage.companyNameLabel")}</legend>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={boardName}
                className="input input-bordered w-full"
                maxLength={120}
              />
            </fieldset>

            <StatusPageLogoUpload supabase={supabase} boardId={boardId} logoUrl={logoUrl} onChange={setLogoUrl} />

            {!logoUrl && (
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  checked={hideBranding}
                  onChange={(e) => setHideBranding(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                {t("boards.statusPage.hideBranding")}
              </label>
            )}

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={saving || !slug} onClick={() => saveMutation.mutate()} className="btn btn-info btn-sm">
                {saving ? <Spinner size="xs" /> : t("boards.statusPage.save")}
              </button>

              {data && (
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => enableMutation.mutate(!data.enabled)}
                  className={`btn btn-sm ${data.enabled ? "btn-ghost" : "btn-success"}`}
                >
                  {publishing ? <Spinner size="xs" /> : data.enabled ? t("boards.statusPage.unpublish") : t("boards.statusPage.publish")}
                </button>
              )}
            </div>

            {data?.enabled && publicPath && (
              <div className="bg-base-100 border-base-300 flex items-center gap-2 rounded-lg border p-2">
                <a href={publicPath} target="_blank" rel="noreferrer" className="link link-hover min-w-0 flex-1 truncate text-sm">
                  {origin}
                  {publicPath}
                </a>
                <button type="button" onClick={handleCopy} className="btn btn-ghost btn-xs" aria-label={t("boards.statusPage.copyLink")}>
                  {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
