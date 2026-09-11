import Link from "next/link";
import type { BlogPost } from "@/features/blog/types";
import BlogPostMeta from "@/features/blog/components/BlogPostMeta";

// daisyUI's `card image-full` — a full-bleed background image (or, absent
// one, a plain gradient standing in for it) with content overlaid on top,
// title in the upper part and BlogPostMeta pinned to the bottom via
// justify-between. No "use client" needed here itself; BlogPostMeta is the
// one piece that touches i18n/computed state.
export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="card image-full aspect-[4/3] w-full shadow-md transition-transform hover:scale-[1.01]">
      <figure>
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="from-primary to-secondary h-full w-full bg-gradient-to-br" aria-hidden="true" />
        )}
      </figure>
      <div className="card-body justify-between p-5">
        <h2 className="card-title text-xl leading-snug text-white">{post.title}</h2>
        <BlogPostMeta post={post} />
      </div>
    </Link>
  );
}
