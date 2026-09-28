import { KEYWORD_SOURCES } from "@/features/early-warnings/services/keywordSources";
import type { RawMatch } from "@/features/early-warnings/services/keywordSources/types";
import { getSupabaseClient } from "@/lib/supabase";
import { nowPlusIso } from "@/lib/formatTime";

const RETENTION_DAYS = 60;

// Deliberately serial and paced: unauthenticated Reddit returns 429 after 2-3 rapid calls.
const REQUEST_DELAY_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Sources are relevance-ranked and can return results without the keyword,
// so re-check title + snippet. Lookarounds, not \b, so non-Latin keywords bound correctly.
function matchesKeyword(match: RawMatch, keyword: string): boolean {
  const escaped = escapeRegExp(keyword.trim());
  if (!escaped) return false;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu");
  return pattern.test(`${match.title} ${match.snippet}`);
}

// Deduped across accounts so N watchers of a keyword cost one poll.
// Service-role, cron-only: never call from a user-facing path.
async function distinctEnabledKeywords(source: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: enabledRows, error: settingsError } = await supabase
    .from("keyword_source_settings")
    .select("user_id")
    .eq("source", source)
    .eq("enabled", true);
  if (settingsError) throw settingsError;

  const userIds = (enabledRows as { user_id: string }[] | null)?.map((row) => row.user_id) ?? [];
  if (userIds.length === 0) return [];

  const { data: watchRows, error: watchError } = await supabase.from("keyword_watches").select("keyword").in("user_id", userIds);
  if (watchError) throw watchError;

  return [...new Set((watchRows as { keyword: string }[] | null)?.map((row) => row.keyword) ?? [])];
}

export async function pollAllKeywordSources(): Promise<{
  sourcesPolled: number;
  keywordsPolled: number;
  matchesUpserted: number;
  filteredOut: number;
  failed: number;
}> {
  const supabase = getSupabaseClient();
  let keywordsPolled = 0;
  let matchesUpserted = 0;
  let filteredOut = 0;
  let failed = 0;

  for (const source of KEYWORD_SOURCES) {
    const keywords = await distinctEnabledKeywords(source.id);

    for (const keyword of keywords) {
      keywordsPolled++;
      try {
        const rawMatches = await source.fetchMatches(keyword);
        const matches = rawMatches.filter((match) => matchesKeyword(match, keyword));
        filteredOut += rawMatches.length - matches.length;
        if (matches.length > 0) {
          const postRows = matches.map((match) => ({
            source: source.id,
            external_id: match.externalId,
            kind: match.kind,
            title: match.title,
            url: match.url,
            author: match.author,
            snippet: match.snippet,
            published_at: match.publishedAt,
            metadata: match.metadata ?? null,
          }));
          const { error: postError } = await supabase
            .from("keyword_matches")
            .upsert(postRows, { onConflict: "source,external_id", ignoreDuplicates: true });
          if (postError) throw postError;

          const linkRows = matches.map((match) => ({ source: source.id, external_id: match.externalId, keyword }));
          const { error: linkError } = await supabase
            .from("keyword_match_keywords")
            .upsert(linkRows, { onConflict: "source,external_id,keyword", ignoreDuplicates: true });
          if (linkError) throw linkError;

          matchesUpserted += postRows.length;
        }
      } catch (error) {
        failed++;
        console.error(`pollAllKeywordSources: "${source.id}" failed for keyword "${keyword}":`, error);
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  const cutoff = nowPlusIso(-RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { error: pruneError } = await supabase.from("keyword_matches").delete().lt("captured_at", cutoff);
  if (pruneError) console.error("pollAllKeywordSources: retention prune failed:", pruneError);

  return { sourcesPolled: KEYWORD_SOURCES.length, keywordsPolled, matchesUpserted, filteredOut, failed };
}
