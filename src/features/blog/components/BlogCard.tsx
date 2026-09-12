import Link from "next/link";
import type { BlogPost } from "@/features/blog/types";
import BlogPostMeta from "@/features/blog/components/BlogPostMeta";

// The image (or, absent one, a plain gradient standing in for it) fills the
// top 60% of the card, nothing overlaid on it — object-cover still crops to
// fill (see the image-fit entry around this component: BlogCard keeps
// object-cover deliberately, unlike BlogPostBody, to protect the title's
// legibility, though the title has since moved off the image entirely).
// Title + BlogPostMeta both live in the bg-base-200 strip below (the bottom
// 40%) instead, tone="dark" on the meta to match. No truncation/line-clamp
// on the title yet — a long one can grow past the strip's nominal height for
// now, deliberate for this pass. No "use client" needed here itself;
// BlogPostMeta is the one piece that touches i18n/computed state.
export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card aspect-[4/3] w-full overflow-hidden shadow-md transition-transform hover:scale-[1.01]"
    >
      <figure className="flex-[3]">
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="from-primary to-secondary h-full w-full bg-gradient-to-br" aria-hidden="true" />
        )}
      </figure>
      <div className="bg-base-200 flex flex-[2] flex-col justify-center gap-1 p-5">
        <h2 className="card-title text-base leading-snug font-semibold">{post.title}</h2>
        <BlogPostMeta post={post} tone="dark" />
      </div>
    </Link>
  );
}
