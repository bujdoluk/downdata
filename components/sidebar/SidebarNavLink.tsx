"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Shared by the desktop sidebar and the mobile hamburger dropdown — one
// entry per top-level page (Services, Monitors), highlighted when active.
export default function SidebarNavLink({
  href,
  icon,
  label,
  collapsed = false,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      className={`flex items-center text-sm font-semibold tracking-wide uppercase transition-colors ${
        collapsed ? "justify-center" : "w-full justify-center gap-2"
      } ${isActive ? "text-base-content" : "text-base-content/40 hover:text-base-content/70"}`}
    >
      {icon}
      {!collapsed && label}
    </Link>
  );
}
