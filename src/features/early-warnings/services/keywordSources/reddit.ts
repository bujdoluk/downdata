import { XMLParser } from "fast-xml-parser";
import type { KeywordSource, RawMatch } from "@/features/early-warnings/services/keywordSources/types";

// Reddit's documented minimum for unauthenticated access.
const USER_AGENT = "downdata-early-warnings/1.0 (+https://downdata.app)";

// Posts only: search.rss ignores &type=comment. Results are relevance-ranked,
// not verified matches; pollKeywordSources' matchesKeyword() re-checks them.
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
    // Skip subreddit pseudo-entries (t5_); only posts (t3_) are matches.
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
