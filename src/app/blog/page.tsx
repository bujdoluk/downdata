import type { Metadata } from "next";
import { getPublishedPosts } from "@/features/blog/services/blogPosts";
import BlogPageContent from "@/features/blog/components/BlogPageContent";

const title = "Blog | downDATA";
const description = "Updates, incident retrospectives, and news from the downDATA team.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { title, description, url: "/blog", siteName: "downDATA", type: "website" },
  twitter: { card: "summary", title, description },
};

// Without this, Next statically prerenders this page at *build time*
// (no dynamic segment, nothing else forcing on-demand rendering) — so a
// migration that hasn't reached the target database yet (see the
// deployment-ordering note this fixed) hard-fails the entire build/deploy
// instead of just erroring on the one request that hits it.
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <BlogPageContent posts={posts} />;
}
