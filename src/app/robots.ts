import type { MetadataRoute } from "next";

// Block-all-by-default, then explicitly allow the real public surface —
// mirrors proxy.ts's own "everything requires a session unless
// allowlisted" model rather than enumerating every private route (there
// are many, and new ones get added; a disallow-list would silently go
// stale, an allow-list on a deny-by-default base doesn't). Keep this in
// sync with proxy.ts's PUBLIC_EXACT/PUBLIC_PREFIXES whenever a new public
// route is added — /login, /reset-password, /auth/, and every /api/*
// endpoint are deliberately left out even though some are technically
// reachable without a session: no SEO value in indexing a login page or
// a JSON endpoint.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/landing-page",
        "/about",
        "/faq",
        "/pricing",
        "/blog",
        "/blog/",
        "/support",
        "/privacy",
        "/terms",
        "/mvp",
        "/features/",
        "/integrations/",
        "/services/",
        "/status/",
      ],
      disallow: "/",
    },
  };
}
