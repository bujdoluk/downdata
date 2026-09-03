"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useOrigin } from "@/hooks/useOrigin";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { BoardStatusPage } from "@/types/statusPage";
import Spinner from "@/components/Spinner";
import { GlobeIcon, CopyIcon, CheckIcon } from "@/components/icons/NavIcons";

// Bare content only, no outer margin/card/sizing — BoardDetailContent's
// grid owns that uniformly across all 6 cells, same convention as its
// siblings. Deliberately just a summary + link, not the full form — the
// full BoardStatusPageSettings form now lives only on /status-pages,
// reading the same queryKeys.boards.statusPage(boardId) cache entry so
// navigating there doesn't cost a second fetch if this cell already
// loaded it.
export default function BoardStatusPageSummary({ boardId }: { boardId: string }) {
  const { t } = useTranslation();
  const origin = useOrigin();
  const { copied, copy } = useCopyToClipboard();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.boards.statusPage(boardId),
    queryFn: () => fetchJson<BoardStatusPage | null>(`/api/boards/${boardId}/status-page`),
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("boards.statusPage.title")}</h2>
        <Link href="/status-pages" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
          {t("boards.statusPage.manage")}
        </Link>
      </div>

      {isLoading ? (
        <Spinner size="sm" className="mt-3" />
      ) : (
        <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
          <GlobeIcon className="text-base-content/30" />
          {data?.enabled ? (
            <>
              <span className="badge badge-success badge-xs">{t("boards.statusPage.live")}</span>
              <div className="flex min-w-0 items-center gap-1">
                <p className="text-base-content/50 min-w-0 break-all text-xs">/status/{data.slug}</p>
                <button
                  type="button"
                  onClick={() => copy(`${origin}/status/${data.slug}`)}
                  className="btn btn-ghost btn-xs shrink-0"
                  aria-label={t("boards.statusPage.copyLink")}
                >
                  {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
                </button>
              </div>
            </>
          ) : (
            <p className="text-base-content/50 text-xs">{t("boards.statusPage.notPublished")}</p>
          )}
        </div>
      )}
    </>
  );
}
