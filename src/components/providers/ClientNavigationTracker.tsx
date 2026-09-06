"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markClientNavigation } from "@/lib/clientNavigationTracker";

export default function ClientNavigationTracker() {
  const pathname = usePathname();
  const firstPathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== firstPathnameRef.current) markClientNavigation();
  }, [pathname]);

  return null;
}
