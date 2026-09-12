import Link from "next/link";
import type { BlogPost } from "@/features/blog/types";
import BlogCardBody from "@/features/blog/components/BlogCardBody";

// The image (or, absent one, a plain gradient standing in for it) fills the
// top 60% of the card, nothing overlaid on it — object-cover still crops to
// fill (see the image-fit entry around this component: BlogCard keeps
// object-cover deliberately, unlike BlogPostBody, to protect the title's
// legibility, though the title has since moved off the image entirely).
// Title + BlogPostMeta both live in the bg-base-200 strip below (the bottom
// 40%) instead, tone="dark" on the meta to match. No truncation/line-clamp
// on the title yet — a long one can grow past the strip's nominal height for
// now, deliberate for this pass.
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
