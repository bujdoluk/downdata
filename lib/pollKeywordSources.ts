import { KEYWORD_SOURCES } from "@/lib/keywordSources";
import type { RawMatch } from "@/lib/keywordSources/types";
import { getSupabaseClient } from "@/lib/supabase";
import { nowPlusIso } from "@/lib/formatTime";

const RETENTION_DAYS = 60;

// Deliberately slow — confirmed live that unauthenticated Reddit requests
// 429 after just 2-3 rapid calls, nowhere close to the incident poller's
// 200-way concurrency (lib/runInBatches.ts has no inter-call delay, which
// is exactly what would trip that limit here). One keyword at a time, with
// a real pause between requests, not a batch size to tune up later.
const REQUEST_DELAY_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A source's own search (Reddit's search.rss included) is relevance-ranked,
// not a literal keyword match — confirmed live, it can return a result that
// doesn't contain the keyword anywhere at all. This re-checks every result
// against exactly what gets stored/shown (title + snippet, not the full
// untruncated post) before it's ever written to keyword_matches, so every
// match a user sees is self-evidently justified by its own preview.
// Word-boundary, not substring — a plain .includes() would still let
// through a different false positive ("aws" inside "flaws"). Lookaround
// instead of \b: \b only treats ASCII [A-Za-z0-9_] as "word" characters,
// which would silently fail to bound non-Latin keywords (this app's
// keyword_watches.keyword is free text across 13 locales).
function matchesKeyword(match: RawMatch, keyword: string): boolean {
  const escaped = escapeRegExp(keyword.trim());
  if (!escaped) return false;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu");
  return pattern.test(`${match.title} ${match.snippet}`);
}

// Distinct keywords across every account that has this source enabled —
// the cross-account dedup that makes N accounts watching the same keyword
// cost one poll, not N. Two plain queries, not a PostgREST embed: the two
// tables share no foreign key (each independently references auth.users,
// not each other), same "group in application code" shape as
// lib/boards.ts's getAllTrackedSlugsAcrossUsers(). Service-role,
// cron-only: never call this from a user-facing code path. If nobody has
// this source enabled, the second query returns nothing and it's skipped
// for this cycle entirely — the "off by default" design means an unused
// source costs zero requests.
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
          // Post content, written once per real match regardless of how
          // many watched keywords eventually find it — matches
          // keyword_matches's (source, external_id) primary key.
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

          // Which keyword(s) found this post — re-polling the same keyword
          // against a post it already matched just no-ops here.
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

      // Paced even after the very last keyword of a source — simpler than
      // special-casing "unless this is the last one", and one extra 3s
      // wait is negligible against the cron's own interval.
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // A negative duration is a subtraction as far as Temporal's add() is
  // concerned — nowPlusIso(-N) is "N ago", no separate helper needed.
  const cutoff = nowPlusIso(-RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { error: pruneError } = await supabase.from("keyword_matches").delete().lt("captured_at", cutoff);
  if (pruneError) console.error("pollAllKeywordSources: retention prune failed:", pruneError);

  return { sourcesPolled: KEYWORD_SOURCES.length, keywordsPolled, matchesUpserted, filteredOut, failed };
}
