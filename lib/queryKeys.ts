// Central query key factory — every useQuery/useMutation in the app reads
// its key from here so a mutation's invalidateQueries always matches the
// query it's meant to invalidate.
export const queryKeys = {
  catalogStatus: () => ["status", "catalog"] as const,
  serviceStatus: (slug: string) => ["status", "service", slug] as const,
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
  },
  integrations: {
    list: () => ["integrations", "list"] as const,
  },
  account: () => ["account"] as const,
};
