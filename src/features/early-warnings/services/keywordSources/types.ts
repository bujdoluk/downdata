export type RawMatch = {
  externalId: string;
  kind: "post" | "comment";
  title: string;
  url: string;
  author: string;
  snippet: string;
  publishedAt: string;
  metadata?: Record<string, unknown>;
};

export type KeywordSource = {
  id: string;
  label: string;
  fetchMatches(keyword: string): Promise<RawMatch[]>;
};
