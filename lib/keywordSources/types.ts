// The contract every Early Warnings source implements. Reddit is the only
// one today, but nothing outside lib/keywordSources/ should ever need to
// know that — the poller, storage, and UI all read through this shape (see
// lib/keywordSources/index.ts's KEYWORD_SOURCES registry).

export type RawMatch = {
  // Stable id within this source (Reddit's t3_.../t1_... fullname) — the
  // dedup key alongside (source, keyword) in the keyword_matches table.
  externalId: string;
  kind: "post" | "comment";
  title: string;
  url: string;
  author: string;
  snippet: string;
  publishedAt: string; // ISO
  // Source-specific extras that don't belong as their own columns (e.g.
  // Reddit's { subreddit }) — stored as-is in keyword_matches.metadata.
  metadata?: Record<string, unknown>;
};

export type KeywordSource = {
  id: string;
  label: string;
  fetchMatches(keyword: string): Promise<RawMatch[]>;
};
