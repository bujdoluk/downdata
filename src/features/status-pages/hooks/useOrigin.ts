"use client";

import { useEffect, useState } from "react";

// Empty until mount: window.location isn't available during SSR.
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  return origin;
}
