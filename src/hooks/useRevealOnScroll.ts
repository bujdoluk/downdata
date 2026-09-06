"use client";

import { useEffect, useRef, useState } from "react";

// IntersectionObserver-driven "fade + rise on first scroll into view" —
// deliberately not a scroll listener (see AGENTS.md's ban on
// window.addEventListener("scroll", ...) for this exact reason: it reruns
// on every frame). The reduced-motion case is handled by the consumer's
// className (Tailwind's motion-reduce: variant forcing the final state),
// not here — setting state synchronously from a matchMedia check inside
// this effect would just be a redundant extra render.
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
