// Central query key factory — every useQuery/useMutation in the app reads
// its key from here so a mutation's invalidateQueries always matches the
// query it's meant to invalidate.
export const queryKeys = {
  catalogStatus: () => ["status", "catalog"] as const,
  catalogAll: () => ["catalog", "all"] as const,
  serviceStatus: (slug: string) => ["status", "service", slug] as const,
  // Deliberately distinct from serviceStatus(slug) above — that key is
  // /api/summary/[slug]'s full-detail shape; this is /api/status/[slug]'s
  // much smaller live-status-only shape. Reusing the same key for both
  // would corrupt the cache.
  quickStatus: (slug: string) => ["status", "quick", slug] as const,
  incidents: {
    list: () => ["incidents", "list"] as const,
    count: () => ["incidents", "count"] as const,
    detail: (slug: string, id: string) => ["incidents", "detail", slug, id] as const,
  },
  maintenance: {
    list: () => ["maintenance", "list"] as const,
    count: () => ["maintenance", "count"] as const,
    detail: (slug: string, id: string) => ["maintenance", "detail", slug, id] as const,
  },
  history: {
    counts: () => ["history", "counts"] as const,
    service: (slug: string) => ["history", "service", slug] as const,
  },
  boards: {
    list: () => ["boards", "list"] as const,
    statusPage: (boardId: string) => ["boards", "statusPage", boardId] as const,
  },
  integrations: {
    list: () => ["integrations", "list"] as const,
  },
  earlyWarnings: {
    keywords: () => ["earlyWarnings", "keywords"] as const,
    sources: () => ["earlyWarnings", "sources"] as const,
    matches: () => ["earlyWarnings", "matches"] as const,
  },
  reports: {
    list: () => ["reports", "list"] as const,
    settings: () => ["reports", "settings"] as const,
  },
  publicStatusPage: (slug: string) => ["publicStatusPage", slug] as const,
  account: () => ["account"] as const,
  subscription: () => ["subscription"] as const,
};
