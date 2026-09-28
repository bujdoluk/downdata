"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate } from "@/lib/formatTime";
import Logo from "@/components/navbar/Logo";
import { computeReadMinutes } from "@/features/blog/services/readTime";
import type { BlogPost } from "@/features/blog/types";

export default function BlogPostMeta({
  post,
  tone = "light",
}: {
  post: Pick<BlogPost, "publishedAt" | "bodyHtml" | "avatarUrl">;
  tone?: "light" | "dark";
}) {
  const { t } = useTranslation();
  const readMinutes = computeReadMinutes(post.bodyHtml);

  return (
    <div className={`flex items-center gap-2 text-xs ${tone === "light" ? "text-white/90" : "text-base-content/60"}`}>
      {post.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
        <img src={post.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <Logo className="h-10 w-10 shrink-0" />
      )}
      {post.publishedAt && <span>{formatDate(post.publishedAt.slice(0, 10))}</span>}
      <span aria-hidden="true">·</span>
      <span>{t("blog.readTime", { count: readMinutes })}</span>
    </div>
  );
}
