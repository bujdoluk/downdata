// Curated list for the landing footer's "Popular Services" column — not
// computed from real tracking data. An earlier draft ranked this
// dynamically from the boards table, but with only a handful of real
// accounts so far that ranking would be near-empty; a fixed list reads
// better than a sparse or padded one until there's enough real usage to
// rank honestly. Revisit once there's real signal to rank by.
export const POPULAR_SERVICE_SLUGS = [
  "cloudflare",
  "digitalocean",
  "github",
  "vercel",
  "supabase",
  "notion",
  "anthropic",
  "openai",
  "twilio",
  "atlassian",
] as const;
