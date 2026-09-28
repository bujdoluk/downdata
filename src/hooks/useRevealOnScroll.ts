"use client";

import { useEffect, useRef, useState } from "react";

// IntersectionObserver, not a per-frame scroll listener. Reduced motion is handled by the
// consumer's motion-reduce: class, avoiding an extra render here.
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
