"use client";

import { useEffect, useState } from "react";

// True only after the first client-side render — guards markup (portals,
// localStorage-derived state) that would otherwise mismatch server HTML.
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Intentional: this is the one legitimate use of the client-only-render
    // effect pattern (see CookieConsent.tsx's hydration-mismatch guard too).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  return hasMounted;
}
