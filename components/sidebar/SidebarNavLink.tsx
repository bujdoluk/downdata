"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function SidebarNavLink({
  href,
  icon,
  label,
  collapsed = false,
  badge,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  collapsed?: boolean;
  badge?: number;
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
        collapsed ? "justify-center" : "w-full justify-start gap-2"
      } ${isActive ? "text-base-content" : "text-base-content/40 hover:text-base-content/70"}`}
    >
      {icon}
      {!collapsed && (
        <>
          {label}
          {!!badge && <span className="badge badge-info badge-sm">{badge}</span>}
        </>
      )}
    </Link>
  );
}
