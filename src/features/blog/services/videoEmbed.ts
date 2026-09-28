function extractYouTubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") {
    return url.pathname.slice(1) || null;
  }
  if (url.hostname.endsWith("youtube.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const embedMatch = /^\/embed\/([\w-]+)/.exec(url.pathname);
    return embedMatch?.[1] ?? null;
  }
  return null;
}

function extractVimeoId(url: URL): string | null {
  if (!url.hostname.endsWith("vimeo.com")) return null;
  const match = /\/(?:video\/)?(\d+)/.exec(url.pathname);
  return match?.[1] ?? null;
}

function wrapEmbed(src: string): string {
  return `<div class="relative my-4 aspect-[16/9] w-full overflow-hidden rounded-box"><iframe src="${src}" class="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
}

// YouTube/Vimeo only: most sites refuse framing (X-Frame-Options/CSP).
// null lets the caller show an actionable error.
export function buildVideoEmbedHtml(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const youTubeId = extractYouTubeId(url);
  if (youTubeId) return wrapEmbed(`https://www.youtube-nocookie.com/embed/${youTubeId}`);

  const vimeoId = extractVimeoId(url);
  if (vimeoId) return wrapEmbed(`https://player.vimeo.com/video/${vimeoId}`);

  return null;
}
