"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate } from "@/lib/formatTime";
import FallbackLogo from "@/components/logos/FallbackLogo";
import { computeReadMinutes } from "@/features/blog/services/readTime";
import type { BlogPost } from "@/features/blog/types";

// Shared by BlogCard (the /blog grid) and BlogPostContent (the detail
// page) so the two never drift. logoSlug is unused for now (see the
// migration's own comment on the deferred per-post logo picker) — every
// post renders FallbackLogo until that ships.
export default function BlogPostMeta({ post, tone = "light" }: { post: BlogPost; tone?: "light" | "dark" }) {
  const { t } = useTranslation();
  const readMinutes = computeReadMinutes(post.bodyHtml);

  return (
    <div className={`flex items-center gap-2 text-xs ${tone === "light" ? "text-white/90" : "text-base-content/60"}`}>
      <FallbackLogo size={20} name="downDATA" />
      {post.publishedAt && <span>{formatDate(post.publishedAt.slice(0, 10))}</span>}
      <span aria-hidden="true">·</span>
      <span>{t("blog.readTime", { count: readMinutes })}</span>
    </div>
  );
}
