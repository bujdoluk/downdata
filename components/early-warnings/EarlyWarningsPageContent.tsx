"use client";

import { useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, epochMs } from "@/lib/formatTime";
import type { KeywordWatch, SourceSetting, KeywordMatch } from "@/types/earlyWarning";
import ListDetailShell from "@/components/service/ListDetailShell";
import SourceToggleRow from "@/components/early-warnings/SourceToggleRow";
import KeywordForm from "@/components/early-warnings/KeywordForm";
import { useSelectAndScrollOnMobile } from "@/lib/useSelectAndScrollOnMobile";
import { useAutoSelectFirstId } from "@/lib/useAutoSelectFirstId";
import { useEarlyWarningsLastViewed } from "@/lib/useEarlyWarningsLastViewed";

type MatchWithId = KeywordMatch & { id: string };

// (source, keyword, external_id) is the table's own primary key — the same
// post can legitimately appear twice in one account's own results if it
// matched two different watched keywords, so external_id alone isn't a
// safe React key/selection id here.
function matchId(match: KeywordMatch): string {
  return `${match.source}:${match.keyword}:${match.externalId}`;
}

async function patchJson(url: string, body: unknown, fallbackError: string): Promise<void> {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  }
}

export default function EarlyWarningsPageContent({
  initialKeywords,
  initialSources,
  initialMatches,
}: {
  initialKeywords: KeywordWatch[];
  initialSources: SourceSetting[];
  initialMatches: KeywordMatch[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastViewed = useEarlyWarningsLastViewed(true);

  const matches: MatchWithId[] = useMemo(() => initialMatches.map((match) => ({ ...match, id: matchId(match) })), [initialMatches]);
  const selectedId = searchParams.get("id");
  const selected = matches.find((match) => match.id === selectedId);

  const detailRef = useRef<HTMLDivElement>(null);
  const selectMatch = useSelectAndScrollOnMobile("/early-warnings", detailRef);
  useAutoSelectFirstId("/early-warnings", selectedId, matches);

  const addKeywordMutation = useMutation({
    mutationFn: async (keyword: string) => {
      const res = await fetch("/api/early-warnings/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("earlyWarnings.somethingWrong"));
      return data as KeywordWatch;
    },
    onSuccess: () => router.refresh(),
  });

  const removeKeywordMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/early-warnings/keywords/${id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });

  const toggleSourceMutation = useMutation({
    mutationFn: ({ source, enabled }: { source: string; enabled: boolean }) =>
      patchJson(`/api/early-warnings/sources/${source}`, { enabled }, t("earlyWarnings.somethingWrong")),
    onSuccess: () => router.refresh(),
  });

  const list = (
    <ul className="mt-4 flex flex-col gap-3">
      {matches.map((match) => {
        const isNew = epochMs(match.capturedAt) > lastViewed;
        const isSelected = match.id === selectedId;
        const subreddit = typeof match.metadata?.subreddit === "string" ? match.metadata.subreddit : null;
        return (
          <li key={match.id}>
            <button
              type="button"
              onClick={() => selectMatch(match.id)}
              className={`card card-border bg-base-100 flex w-full flex-col gap-1 p-4 text-left shadow-md transition-colors ${
                isSelected ? "border-primary" : "hover:border-base-content/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {subreddit && <span className="text-base-content/50 text-xs">r/{subreddit}</span>}
                <span className="text-base-content/40 text-xs">u/{match.author}</span>
                {isNew && <span className="badge badge-xs badge-primary">{t("earlyWarnings.new")}</span>}
              </div>
              <p className="text-base-content truncate text-sm font-medium">{match.title}</p>
              <p className="text-base-content/60 line-clamp-2 text-xs">{match.snippet}</p>
              <p className="text-base-content/40 text-xs">{formatDateTime(match.publishedAt)}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const detail = selected ? (
    <div className="flex flex-col gap-3">
      <h2 className="text-base-content text-lg font-semibold">{selected.title}</h2>
      <p className="text-base-content/60 text-sm whitespace-pre-wrap">{selected.snippet}</p>
      <a href={selected.url} target="_blank" rel="noreferrer" className="link link-primary text-sm">
        {t("earlyWarnings.openLink")}
      </a>
    </div>
  ) : (
    <p className="text-base-content/50 text-sm">{t("earlyWarnings.selectPrompt")}</p>
  );

  const header = (
    <div className="card card-border bg-base-200 mt-4 flex flex-col gap-4 p-4">
      <SourceToggleRow
        sources={initialSources}
        isPending={toggleSourceMutation.isPending}
        onToggle={(source, enabled) => toggleSourceMutation.mutate({ source, enabled })}
      />
      <KeywordForm
        keywords={initialKeywords}
        isSubmitting={addKeywordMutation.isPending}
        error={addKeywordMutation.error?.message ?? null}
        onAdd={(keyword) => addKeywordMutation.mutate(keyword)}
        onRemove={(id) => removeKeywordMutation.mutate(id)}
      />
    </div>
  );

  return (
    <div className="w-full max-w-6xl self-start">
      <ListDetailShell
        title={t("earlyWarnings.title")}
        subtitle={t("earlyWarnings.subtitle")}
        header={header}
        isLoading={false}
        isError={false}
        isEmpty={matches.length === 0}
        loadingLabel=""
        unreachableLabel=""
        emptyLabel={t("earlyWarnings.empty")}
        filters={null}
        list={list}
        detailRef={detailRef}
        detail={detail}
      />
    </div>
  );
}
