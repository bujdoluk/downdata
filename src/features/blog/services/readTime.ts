import { stripHtml } from "@/lib/stripHtml";

const WORDS_PER_MINUTE = 225;

// Computed on render so it can't drift from a hand-edited body.
export function computeReadMinutes(bodyHtml: string): number {
  const text = stripHtml(bodyHtml).trim();
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
