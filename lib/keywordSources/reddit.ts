import { XMLParser } from "fast-xml-parser";
import type { KeywordSource, RawMatch } from "@/lib/keywordSources/types";

// Reddit's own guidance for unauthenticated access is a descriptive User-
// Agent identifying the app — confirmed live (see the Early Warnings plan)
// that even a well-behaved anonymous client still gets rate-limited fast,
// but this is still the documented minimum courtesy, not optional.
const USER_AGENT = "downdata-early-warnings/1.0 (+https://downdata.app)";

// Posts only — search.rss silently ignores &type=comment and returns the
// same post results regardless (confirmed live). There is no free,
// targeted way to search Reddit comments by keyword; see the Early
// Warnings plan for why that's out of scope rather than worked around.
const SEARCH_URL = "https://www.reddit.com/search.rss";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

type AtomEntry = {
  id: string;
  title?: string;
  link?: { "@_href"?: string };
  author?: { name?: string };
  category?: { "@_term"?: string };
  content?: { "#text"?: string } | string;
  published?: string;
};

function textOf(content: AtomEntry["content"]): string {
  if (typeof content === "string") return content;
  return content?.["#text"] ?? "";
}

// Strips the "submitted by ... to r/... [link] [comments]" footer Reddit
// appends to every post's content, and any remaining HTML tags, down to a
// short plain-text preview.
function snippetFrom(html: string): string {
  const withoutFooter = html.split(/submitted by/i)[0] ?? html;
  const plain = withoutFooter
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 280 ? `${plain.slice(0, 280)}…` : plain;
}

async function fetchMatches(keyword: string): Promise<RawMatch[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(keyword)}&sort=new`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Reddit search returned ${res.status}`);

  const xml = await res.text();
  const parsed = parser.parse(xml) as { feed?: { entry?: AtomEntry | AtomEntry[] } };
  const raw = parsed.feed?.entry;
  const entries = raw ? (Array.isArray(raw) ? raw : [raw]) : [];

  return entries.flatMap((entry): RawMatch[] => {
    // Search results occasionally include a pseudo-entry for a matching
    // subreddit itself (id prefixed t5_, no published date) alongside real
    // posts (t3_) — only real posts belong in keyword_matches.
    if (!entry.id.startsWith("t3_") || !entry.published) return [];

    const subreddit = entry.category?.["@_term"];
    return [
      {
        externalId: entry.id,
        kind: "post",
        title: entry.title ?? "",
        url: entry.link?.["@_href"] ?? "",
        author: entry.author?.name ?? "",
        snippet: snippetFrom(textOf(entry.content)),
        publishedAt: entry.published,
        metadata: subreddit ? { subreddit } : undefined,
      },
    ];
  });
}

export const redditSource: KeywordSource = { id: "reddit", label: "Reddit", fetchMatches };
