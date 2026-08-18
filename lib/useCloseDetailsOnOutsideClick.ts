"use client";

import { useEffect, type RefObject } from "react";

export function useCloseDetailsOnOutsideClick(ref: RefObject<HTMLDetailsElement | null>) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        ref.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
}
