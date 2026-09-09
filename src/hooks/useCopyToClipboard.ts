"use client";

import { useState } from "react";

const RESET_DELAY_MS = 2000;

// Shared by BoardStatusPageSettings/BoardStatusPageSummary's copy-link
// buttons and WebhookTargetRow's copy-secret button — write to the
// clipboard, flip `copied` true for a couple of seconds as UI feedback,
// silently no-op if the browser denies clipboard access (the value is
// always shown as plain text too, for a manual copy). Moved here from
// features/status-pages/hooks/ once a second feature (integrations)
// needed the identical thing — was copy-pasted with a renamed constant
// (COPY_RESET_MS vs this file's RESET_DELAY_MS) before this move, exactly
// the kind of duplicate AGENTS.md's own Failure log warns against.
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
