import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { KEYWORD_SOURCES } from "@/lib/keywordSources";
import type { KeywordWatch, SourceSetting, KeywordMatch } from "@/types/earlyWarning";

type WatchRow = { id: string; keyword: string };
type SettingRow = { source: string; enabled: boolean };
type MatchRow = {
  source: string;
  keyword: string;
  external_id: string;
  kind: "post" | "comment";
  title: string;
  url: string;
  author: string;
  snippet: string;
  published_at: string;
  captured_at: string;
  metadata: Record<string, unknown> | null;
};

function toMatch(row: MatchRow): KeywordMatch {
  return {
    source: row.source,
    keyword: row.keyword,
    externalId: row.external_id,
    kind: row.kind,
    title: row.title,
    url: row.url,
    author: row.author,
    snippet: row.snippet,
    publishedAt: row.published_at,
    capturedAt: row.captured_at,
    metadata: row.metadata,
  };
}

export async function getAllKeywordWatches(): Promise<KeywordWatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("keyword_watches").select("id, keyword").order("created_at");
  if (error) throw error;
  return (data as WatchRow[] | null) ?? [];
}

export async function addKeywordWatch(keyword: string): Promise<KeywordWatch> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keyword_watches")
    .upsert({ keyword: keyword.trim() }, { onConflict: "user_id,keyword" })
    .select("id, keyword")
    .single();
  if (error) throw error;
  return data as WatchRow;
}

export async function removeKeywordWatch(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("keyword_watches").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// Every registered source, joined with whether the current account has it
// enabled — a source with no settings row yet reads as disabled, matching
// the column's own default rather than needing a row seeded per account.
export async function getAllSourceSettings(): Promise<SourceSetting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("keyword_source_settings").select("source, enabled");
  if (error) throw error;
  const enabledBySource = new Map((data as SettingRow[] | null)?.map((row) => [row.source, row.enabled]) ?? []);
  return KEYWORD_SOURCES.map((source) => ({ id: source.id, label: source.label, enabled: enabledBySource.get(source.id) ?? false }));
}

export async function setSourceEnabled(source: string, enabled: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("keyword_source_settings").upsert({ source, enabled }, { onConflict: "user_id,source" });
  if (error) throw error;
}

// Matches for the caller's own watched keywords, scoped to sources the
// caller currently has enabled — two steps, not a join, because
// keyword_matches is the global service-role-only cache (no RLS policies
// of its own, see 0020_early_warnings.sql's comment) while
// keyword_watches/keyword_source_settings are RLS-scoped to the caller.
// The session-scoped reads above are what actually authorize which
// keywords/sources this call is allowed to see; the service-role read
// below only ever fetches rows for that already-authorized (source,
// keyword) combination, so this can't leak another account's matches even
// though keyword_matches itself has no owner column. Filtering by enabled
// source (not just keyword) also matches what "turn a source off" should
// mean — a disabled source's matches disappear from the feed even if
// another account's own opt-in caused the same keyword to be polled there.
export async function getMatchesForOwnKeywords(): Promise<KeywordMatch[]> {
  const [watches, settings] = await Promise.all([getAllKeywordWatches(), getAllSourceSettings()]);
  const keywords = [...new Set(watches.map((w) => w.keyword))];
  const enabledSources = settings.filter((s) => s.enabled).map((s) => s.id);
  if (keywords.length === 0 || enabledSources.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("keyword_matches")
    .select("source, keyword, external_id, kind, title, url, author, snippet, published_at, captured_at, metadata")
    .in("keyword", keywords)
    .in("source", enabledSources)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data as MatchRow[] | null) ?? []).map(toMatch);
}
