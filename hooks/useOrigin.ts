"use client";

import { useEffect, useState } from "react";

// window.location.origin is only available client-side — this fills in
// after mount, empty ("") until then. Shared by BoardStatusPageSettings
// and BoardStatusPageSummary for displaying/copying a full public URL.
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // window isn't available during SSR — this can only run post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  return origin;
}
