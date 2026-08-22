"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "hasVisited";

// Sends a first-ever visitor to `to` instead of wherever this hook is
// mounted. Once the flag is set, every later visit is left alone.
export function useFirstVisitRedirect(to: string) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, "true");
        router.replace(to);
      }
    } catch {
      // ignore — Safari private mode etc., same guard used elsewhere for localStorage
    }
  }, [router, to]);
}
