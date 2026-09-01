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
  badgeTitle,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  collapsed?: boolean;
  badge?: number;
  badgeTitle?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      className={`flex items-center justify-center gap-2 text-sm font-semibold tracking-wide uppercase transition-colors ${
        collapsed ? "" : "md:w-full md:justify-start"
      } ${isActive ? "text-base-content" : "text-base-content/40 hover:text-base-content/70"}`}
    >
      <span className="relative inline-flex">
        {icon}
        {collapsed && !!badge && (
          <span className="badge badge-info badge-xs absolute -top-1.5 -right-2.5 px-1" title={badgeTitle}>
            {badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="hidden items-center gap-2 md:inline-flex">
          {label}
          {!!badge && (
            <span className="badge badge-info badge-sm" title={badgeTitle}>
              {badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
