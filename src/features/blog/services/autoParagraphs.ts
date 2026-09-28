const HTML_TAG_PATTERN = /<[a-z][a-z0-9]*(?:\s[^>]*)?>/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Checked per chunk, not per body: chunks containing any HTML tag are left
// untouched, but one inserted tag mustn't disable wrapping for the rest.
export function autoParagraphs(bodyHtml: string): string {
  return bodyHtml
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (HTML_TAG_PATTERN.test(chunk) ? chunk : `<p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p>`))
    .join("");
}
