import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolvePostBySlug } from "@/features/blog/services/blogPosts";
import { stripHtml } from "@/lib/stripHtml";
import BlogPostContent from "@/features/blog/components/BlogPostContent";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePostBySlug(slug);
  if (!post || !post.publishedAt) return {};

  const title = `${post.title} | downDATA Blog`;
  const description = stripHtml(post.bodyHtml).trim().slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title, description, url: `/blog/${post.slug}`, siteName: "downDATA", type: "article" },
    twitter: { card: "summary", title, description },
  };
}

// resolvePostBySlug also returns drafts, so they must 404 here.
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await resolvePostBySlug(slug);

  if (!post || !post.publishedAt) {
    notFound();
  }

  return <BlogPostContent post={post} />;
}
