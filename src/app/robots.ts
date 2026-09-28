import type { MetadataRoute } from "next";

// Deny by default, mirroring proxy.ts's allowlist; keep in sync with PUBLIC_EXACT/PUBLIC_PREFIXES.
// Auth pages and /api/* are left out on purpose: no SEO value.
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
        "/free-tools/",
        "/services/",
        "/status/",
      ],
      disallow: "/",
    },
  };
}
