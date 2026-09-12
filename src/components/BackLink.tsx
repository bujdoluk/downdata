"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { hasNavigatedClientSide } from "@/lib/clientNavigationTracker";

// "Wherever you came from, with a direct-visit fallback" — the pattern
// AboutContent.tsx/SupportContent.tsx each used independently before this
// was pulled out shared: router.back() when this tab actually navigated
// somewhere first (hasNavigatedClientSide, tracked from the root layout —
// window.history.length/document.referrer aren't reliable signals, see
// clientNavigationTracker.ts's own comment), otherwise `fallbackHref` for a
// direct/bookmarked visit with no real history to return to. For a page
// reachable from exactly one obvious parent, a plain fixed <Link> is still
// the right call (see PageHeader's own comment) — this is only for pages
// reachable from many places, where no single fixed destination is correct.
// `label` is caller-supplied rather than baked in via t() — this renders on
// both i18n'd pages and the plain-English admin blog pages.
export default function BackLink({ fallbackHref, label }: { fallbackHref: string; label: ReactNode }) {
  const router = useRouter();

  function handleClick() {
    if (hasNavigatedClientSide()) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
    >
      {label}
    </button>
  );
}
