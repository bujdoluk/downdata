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

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <BlogPageContent posts={posts} />;
}
