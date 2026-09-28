import BlogPostMeta from "@/features/blog/components/BlogPostMeta";
import { nowIso } from "@/lib/formatTime";

// No Link wrapper so the admin preview can render it without a saved slug.
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
