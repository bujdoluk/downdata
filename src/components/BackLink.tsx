"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { hasNavigatedClientSide } from "@/lib/clientNavigationTracker";

// For pages reachable from many places. Uses hasNavigatedClientSide since history.length and
// referrer are unreliable; `label` is caller-supplied because admin pages aren't i18n'd.
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
