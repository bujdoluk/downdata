"use client";

import { useState } from "react";

const RESET_DELAY_MS = 2000;

export function useCopyToClipboard(): { copied: boolean; copy: (text: string) => Promise<void> } {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), RESET_DELAY_MS);
    } catch {
      // ignore: access can be denied, and the value is always shown for manual copy
    }
  }

  return { copied, copy };
}
