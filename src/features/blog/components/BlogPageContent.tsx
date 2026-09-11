"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import BlogCard from "@/features/blog/components/BlogCard";
import type { BlogPost } from "@/features/blog/types";

export default function BlogPageContent({ posts }: { posts: BlogPost[] }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">{t("blog.title")}</h1>
        <p className="text-base-content/70 mt-2 max-w-xl">{t("blog.subtitle")}</p>

        {posts.length === 0 ? (
          <p className="text-base-content/50 mt-10 text-sm">{t("blog.empty")}</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
