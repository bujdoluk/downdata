"use client";

import type { ReactNode } from "react";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

// Thin wrapper so each grid/list item can call useRevealOnScroll from its
// own component instance — the hook can't be called directly inside a
// .map() on the parent (rules of hooks).
export default function RevealOnScroll({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, isVisible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`motion-reduce:opacity-100! motion-reduce:translate-y-0! motion-reduce:transition-none! transition-[opacity,transform] duration-500 ease-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${className}`}
      style={{ transitionDelay: isVisible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
