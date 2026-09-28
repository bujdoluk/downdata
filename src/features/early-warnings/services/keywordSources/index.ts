import { redditSource } from "@/features/early-warnings/services/keywordSources/reddit";
import type { KeywordSource } from "@/features/early-warnings/services/keywordSources/types";

// Import sources only through this registry; the poller and UI read it.
export const KEYWORD_SOURCES: KeywordSource[] = [redditSource];

export function resolveKeywordSource(id: string): KeywordSource | undefined {
  return KEYWORD_SOURCES.find((source) => source.id === id);
}
