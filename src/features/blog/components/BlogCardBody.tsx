import BlogPostMeta from "@/features/blog/components/BlogPostMeta";
import { nowIso } from "@/lib/formatTime";

// The card's actual visual — image/gradient, title, meta strip — with no
// Link wrapper and no dependency on a real slug, shared by BlogCard (the
// real /blog grid) and BlogPostPreviewModal's "Card" view, same reasoning
// as BlogPostBody's own split from BlogPostContent: a preview has neither a
// saved slug to link to nor any business navigating away if clicked.
// publishedAt falls back to today when absent (an unsaved/draft preview has
// none yet), same as BlogPostBody — the real BlogCard never actually hits
// this branch, since the public grid only ever renders published posts.
export default function BlogCardBody({
  title,
  imageUrl,
  publishedAt,
  bodyHtml,
  avatarUrl,
}: {
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
  bodyHtml: string;
  avatarUrl: string | null;
}) {
  return (
    <>
      <figure className="flex-[3]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="from-primary to-secondary h-full w-full bg-gradient-to-br" aria-hidden="true" />
        )}
      </figure>
      <div className="bg-base-200 flex flex-[2] flex-col justify-center gap-1 p-5">
        <h2 className="card-title text-base leading-snug font-semibold">{title}</h2>
        <BlogPostMeta post={{ publishedAt: publishedAt ?? nowIso(), bodyHtml, avatarUrl }} tone="dark" />
      </div>
    </>
  );
}
