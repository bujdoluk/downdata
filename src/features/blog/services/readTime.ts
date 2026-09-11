import { stripHtml } from "@/lib/stripHtml";

const WORDS_PER_MINUTE = 225;

// Computed on render, not stored — a post's read time only ever needs to
// reflect its current body, and storing it would just be one more field
// an admin editing raw HTML in a textarea has to remember to keep in sync.
export function computeReadMinutes(bodyHtml: string): number {
  const text = stripHtml(bodyHtml).trim();
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
