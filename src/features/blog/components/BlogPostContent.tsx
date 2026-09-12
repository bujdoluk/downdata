"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import BlogPostBody from "@/features/blog/components/BlogPostBody";
import type { BlogPost } from "@/features/blog/types";

export default function BlogPostContent({ post }: { post: BlogPost }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link href="/blog" className="link link-hover text-base-content/60 hover:text-base-content text-sm font-medium">
          {t("blog.backToBlog")}
        </Link>

        <BlogPostBody
          title={post.title}
          imageUrl={post.imageUrl}
          bodyHtml={post.bodyHtml}
          publishedAt={post.publishedAt}
          avatarUrl={post.avatarUrl}
        />
      </div>
      <Footer />
    </div>
  );
}
