const HTML_TAG_PATTERN = /<[a-z][a-z0-9]*(?:\s[^>]*)?>/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Renders a blank-line-separated chunk of plain text as a real paragraph:
// escapes stray &/</>, and turns single newlines within it into <br>. A
// chunk that already contains any HTML tag — typed markup, or an inserted
// <img>/video-embed snippet (see BlogPostForm's "Insert image"/"Insert
// video") — is left completely untouched instead.
//
// Checked per chunk, not once for the whole body: an earlier version
// bailed out entirely the moment *any* tag appeared anywhere in the post,
// which meant using either insert button (or writing one <h2> by hand)
// silently turned off paragraph-wrapping for every *other*, otherwise
// plain-text paragraph too — the exact whitespace-collapsing bug this
// exists to fix, reintroduced by the very buttons promoted next to it.
export function autoParagraphs(bodyHtml: string): string {
  return bodyHtml
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (HTML_TAG_PATTERN.test(chunk) ? chunk : `<p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p>`))
    .join("");
}
