"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import BlogPostMeta from "@/features/blog/components/BlogPostMeta";
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

        <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-box">
          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
            <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="from-primary to-secondary h-full w-full bg-gradient-to-br" aria-hidden="true" />
          )}
        </div>

        <h1 className="mt-6 text-3xl leading-tight font-bold">{post.title}</h1>
        <div className="mt-3">
          <BlogPostMeta post={post} tone="dark" />
        </div>

        {/* Trusted content: body_html is only ever written by the site
            owner through the ADMIN_EMAIL-gated admin UI, never by an
            arbitrary user, so there's no untrusted-HTML injection risk
            here the way there would be for user-submitted content.

            No typography plugin is installed in this repo (see
            globals.css — daisyUI only), so raw body HTML gets styled via
            Tailwind's arbitrary descendant-selector syntax directly,
            rather than adding @tailwindcss/typography for one component. */}
        <div
          className="text-base-content mt-8 max-w-none [&_a]:link [&_a]:text-info [&_blockquote]:border-base-300 [&_blockquote]:text-base-content/70 [&_blockquote]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-base-200 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-box [&_img]:my-4 [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_pre]:bg-base-200 [&_pre]:rounded-box [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_strong]:font-semibold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </div>
      <Footer />
    </div>
  );
}
