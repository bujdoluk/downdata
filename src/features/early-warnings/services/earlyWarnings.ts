import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { KEYWORD_SOURCES } from "@/features/early-warnings/services/keywordSources";
import type { KeywordWatch, SourceSetting, KeywordMatch } from "@/features/early-warnings/types";

type WatchRow = { id: string; keyword: string };
type SettingRow = { source: string; enabled: boolean };
type MatchRow = {
  source: string;
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
type LinkRow = { source: string; external_id: string; keyword: string };

// id is a uuid, so a malformed one would make Postgres error instead of "not found".
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toMatch(row: MatchRow, keywords: string[]): KeywordMatch {
  return {
    source: row.source,
    keywords,
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
  if (!UUID_PATTERN.test(id)) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.from("keyword_watches").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// No settings row reads as disabled, matching the column default.
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

// Grouped in app code: keyword_matches tables are a global service-role cache
// (no RLS), while watches/settings are RLS-scoped to the caller.
export async function getMatchesForOwnKeywords(): Promise<KeywordMatch[]> {
  const [watches, settings] = await Promise.all([getAllKeywordWatches(), getAllSourceSettings()]);
  const keywords = [...new Set(watches.map((w) => w.keyword))];
  const enabledSources = settings.filter((s) => s.enabled).map((s) => s.id);
  if (keywords.length === 0 || enabledSources.length === 0) return [];

  const supabase = getSupabaseClient();

  // Only keywords from the RLS-authorized reads above are queried, so other
  // accounts' keywords can't leak despite no owner column.
  const { data: linkData, error: linkError } = await supabase
    .from("keyword_match_keywords")
    .select("source, external_id, keyword")
    .in("keyword", keywords)
    .in("source", enabledSources);
  if (linkError) throw linkError;

  const keywordsByPost = new Map<string, Set<string>>();
  const idsBySource = new Map<string, Set<string>>();
  for (const row of (linkData as LinkRow[] | null) ?? []) {
    const postKey = `${row.source}:${row.external_id}`;
    const postKeywords = keywordsByPost.get(postKey) ?? new Set<string>();
    postKeywords.add(row.keyword);
    keywordsByPost.set(postKey, postKeywords);

    const sourceIds = idsBySource.get(row.source) ?? new Set<string>();
    sourceIds.add(row.external_id);
    idsBySource.set(row.source, sourceIds);
  }
  if (keywordsByPost.size === 0) return [];

  // PostgREST has no composite-key .in(), so one query per source.
  const matchRows: MatchRow[] = [];
  for (const [source, externalIds] of idsBySource) {
    const { data, error } = await supabase
      .from("keyword_matches")
      .select("source, external_id, kind, title, url, author, snippet, published_at, captured_at, metadata")
      .eq("source", source)
      .in("external_id", [...externalIds]);
    if (error) throw error;
    matchRows.push(...((data as MatchRow[] | null) ?? []));
  }

  return matchRows
    .map((row) => toMatch(row, [...(keywordsByPost.get(`${row.source}:${row.external_id}`) ?? [])].sort()))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 200);
}
