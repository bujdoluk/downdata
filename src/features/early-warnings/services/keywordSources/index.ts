import { redditSource } from "@/lib/keywordSources/reddit";
import type { KeywordSource } from "@/lib/keywordSources/types";

// The registry a future platform gets added to — one new file implementing
// KeywordSource, one new entry here, and both the poller and the UI's
// source-toggle row pick it up automatically. Nothing else in the app
// should import an individual source module directly.
export const KEYWORD_SOURCES: KeywordSource[] = [redditSource];

export function resolveKeywordSource(id: string): KeywordSource | undefined {
  return KEYWORD_SOURCES.find((source) => source.id === id);
}
