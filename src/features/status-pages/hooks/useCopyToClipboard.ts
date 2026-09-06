"use client";

import { useState } from "react";

const RESET_DELAY_MS = 2000;

// Shared by BoardStatusPageSettings and BoardStatusPageSummary's copy-link
// buttons — write to the clipboard, flip `copied` true for a couple of
// seconds as UI feedback, silently no-op if the browser denies clipboard
// access (the URL is always shown as plain text too, for a manual copy).
export function useCopyToClipboard(): { copied: boolean; copy: (text: string) => Promise<void> } {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), RESET_DELAY_MS);
    } catch {
      // ignore — clipboard access can be denied by the browser
    }
  }

  return { copied, copy };
}
