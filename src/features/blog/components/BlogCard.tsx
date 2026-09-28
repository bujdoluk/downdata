import Link from "next/link";
import type { BlogPost } from "@/features/blog/types";
import BlogCardBody from "@/features/blog/components/BlogCardBody";

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card aspect-[4/3] w-full overflow-hidden shadow-md transition-transform hover:scale-[1.01]"
    >
      <BlogCardBody
        title={post.title}
        imageUrl={post.imageUrl}
        publishedAt={post.publishedAt}
        bodyHtml={post.bodyHtml}
        avatarUrl={post.avatarUrl}
      />
    </Link>
  );
}
