"use client";

import { useEffect, useState } from "react";

// Guards client-only markup that would otherwise mismatch server HTML.
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the one legitimate client-only-render effect
    setHasMounted(true);
  }, []);

  return hasMounted;
}
