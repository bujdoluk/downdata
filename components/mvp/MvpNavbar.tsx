"use client";

import Link from "next/link";
import Logo from "@/components/navbar/Logo";
import ThemeToggle from "@/components/navbar/ThemeToggle";

export default function MvpNavbar() {
  return (
    <nav className="border-base-300 shrink-0 border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
        <Link href="/mvp" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
          <Logo className="h-6 w-6" />
          <span>
            <span className="text-primary">down</span>DATA
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
