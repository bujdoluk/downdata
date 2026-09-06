export type KeywordWatch = {
  id: string;
  keyword: string;
};

export type SourceSetting = {
  id: string;
  label: string;
  enabled: boolean;
};

export type KeywordMatch = {
  source: string;
  // Every one of the account's own watched keywords that matched this
  // post — a post can legitimately match more than one.
  keywords: string[];
  externalId: string;
  kind: "post" | "comment";
  title: string;
  url: string;
  author: string;
  snippet: string;
  publishedAt: string;
  capturedAt: string;
  metadata: Record<string, unknown> | null;
};
