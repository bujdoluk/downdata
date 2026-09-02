"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, epochMs } from "@/lib/formatTime";
import type { KeywordWatch, SourceSetting, KeywordMatch } from "@/types/earlyWarning";
import ListDetailShell from "@/components/service/ListDetailShell";
import SourceToggleRow from "@/components/early-warnings/SourceToggleRow";
import AddKeywordForm from "@/components/early-warnings/AddKeywordForm";
import KeywordBadgeList from "@/components/early-warnings/KeywordBadgeList";
import ClearFiltersButton from "@/components/service/ClearFiltersButton";
import { useSelectAndScrollOnMobile } from "@/hooks/useSelectAndScrollOnMobile";
import { useAutoSelectFirstId } from "@/hooks/useAutoSelectFirstId";
import { useEarlyWarningsLastViewed } from "@/hooks/useEarlyWarningsLastViewed";
import { useTimeZone } from "@/hooks/useTimeZone";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { mergeParams } from "@/lib/mergeParams";

type MatchWithId = KeywordMatch & { id: string };

// Fewer than the Incidents/Maintenance sibling pages' PAGE_SIZE=7 — this
// page's header panel (source toggles + keyword form + keyword badges)
// has no equivalent there and eats real vertical space above the list,
// and each card's keyword-badge row runs taller/more variable than their
// compact status badge.
const PAGE_SIZE = 5;

// (source, external_id) is keyword_matches's own primary key — one row per
// real post regardless of how many watched keywords matched it (see
// match.keywords).
function matchId(match: KeywordMatch): string {
  return `${match.source}:${match.externalId}`;
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
  const timeZone = useTimeZone();

  const matches: MatchWithId[] = useMemo(() => initialMatches.map((match) => ({ ...match, id: matchId(match) })), [initialMatches]);
  const selectedId = searchParams.get("id");
  const page = Number(searchParams.get("page") ?? "1");
  // Deliberately looked up against the full list, not filteredMatches below
  // — narrowing the keyword filter shouldn't blank out an already-open
  // detail pane just because its post fell outside the current filter,
  // same behavior IncidentsPageContent already has for its own filters.
  const selected = matches.find((match) => match.id === selectedId);

  const [selectedKeyword, setSelectedKeyword] = useState("");
  const keywordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const match of matches) {
      for (const keyword of match.keywords) counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
    return counts;
  }, [matches]);
  const availableKeywords = useMemo(() => [...keywordCounts.keys()].sort(), [keywordCounts]);
  const filteredMatches = useMemo(
    () => (selectedKeyword ? matches.filter((match) => match.keywords.includes(selectedKeyword)) : matches),
    [matches, selectedKeyword],
  );

  const detailRef = useRef<HTMLDivElement>(null);
  const selectMatch = useSelectAndScrollOnMobile("/early-warnings", detailRef);
  useAutoSelectFirstId("/early-warnings", selectedId, filteredMatches);

  const { listRef, minListHeight, totalPages, currentPage, pageItems: pageMatches } = usePagination(
    filteredMatches,
    page,
    PAGE_SIZE,
  );

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`/early-warnings?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  function goToPage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) });
  }

  // Narrowing the keyword filter can leave the current page past the end
  // of the now-shorter list — usePagination already clamps that
  // defensively, but resetting the URL param explicitly (matching
  // Incidents/Maintenance's debouncedGroupPatch) avoids a stale ?page=3
  // resurfacing if the filter is broadened back later.
  function selectKeyword(keyword: string) {
    setSelectedKeyword(keyword);
    updateParams({ page: null });
  }

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
    <>
      {filteredMatches.length === 0 ? (
        <p className="text-base-content/50 text-sm">{t("earlyWarnings.noMatches")}</p>
      ) : (
        <ul
          ref={listRef}
          style={{ minHeight: totalPages > 1 ? minListHeight : undefined }}
          className="flex flex-col gap-3"
        >
          {pageMatches.map((match) => {
            const isNew = epochMs(match.capturedAt) > lastViewed;
            const isSelected = match.id === selectedId;
            const subreddit = typeof match.metadata?.subreddit === "string" ? match.metadata.subreddit : null;
            return (
              <li key={match.id}>
                <button
                  type="button"
                  onClick={() => selectMatch(match.id)}
                  className={`card card-border bg-base-200 flex w-full flex-col gap-1 p-4 text-left shadow-md transition-colors ${
                    isSelected ? "border-primary" : "hover:border-base-content/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {subreddit && <span className="text-base-content/50 text-xs">r/{subreddit}</span>}
                    <span className="text-base-content/40 text-xs">u/{match.author}</span>
                    {isNew && <span className="badge badge-xs badge-primary">{t("earlyWarnings.new")}</span>}
                  </div>
                  <p className="text-base-content truncate text-sm font-medium">{match.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {match.keywords.map((keyword) => (
                      <span key={keyword} className="badge badge-sm badge-outline">
                        {keyword}
                      </span>
                    ))}
                    <span className="text-base-content/40 ml-auto text-xs whitespace-nowrap">{formatDateTime(match.publishedAt, timeZone)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onChange={goToPage}
      label={t("incidents.pagination.label")}
      prevLabel={t("incidents.pagination.previous")}
      nextLabel={t("incidents.pagination.next")}
    />
  );

  const filters = availableKeywords.length > 0 && (
    <form className="flex flex-wrap items-center gap-2">
      <select
        className="select select-bordered select-sm w-48"
        aria-label={t("earlyWarnings.filter.allKeywords")}
        value={selectedKeyword}
        onChange={(e) => selectKeyword(e.target.value)}
      >
        <option value="">{t("earlyWarnings.filter.allKeywords")}</option>
        {availableKeywords.map((keyword) => (
          <option key={keyword} value={keyword}>
            {keyword} ({keywordCounts.get(keyword)})
          </option>
        ))}
      </select>
      {selectedKeyword && <ClearFiltersButton label={t("incidents.filter.clearFilters")} onClick={() => selectKeyword("")} />}
    </form>
  );

  const detail = selected ? (
    <div className="flex flex-col gap-3">
      <h2 className="text-base-content text-lg font-semibold break-words">{selected.title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {selected.keywords.map((keyword) => (
          <span key={keyword} className="badge badge-sm badge-outline">
            {keyword}
          </span>
        ))}
      </div>
      <p className="text-base-content/60 text-sm whitespace-pre-wrap break-words">{selected.snippet}</p>
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
        trailing={
          <AddKeywordForm
            isSubmitting={addKeywordMutation.isPending}
            error={addKeywordMutation.error?.message ?? null}
            onAdd={(keyword) => addKeywordMutation.mutate(keyword)}
          />
        }
      />
      <KeywordBadgeList keywords={initialKeywords} onRemove={(id) => removeKeywordMutation.mutate(id)} />
    </div>
  );

  return (
    <div className="w-full self-start">
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
        filters={filters}
        list={list}
        detailRef={detailRef}
        detail={detail}
        pagination={pagination}
      />
    </div>
  );
}
