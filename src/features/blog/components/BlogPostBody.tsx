import BlogPostMeta from "@/features/blog/components/BlogPostMeta";
import { autoParagraphs } from "@/features/blog/services/autoParagraphs";
import { nowIso } from "@/lib/formatTime";

// Shared by the public page and the admin preview so they can't drift.
// publishedAt falls back to today only for draft previews; never persisted.
export default function BlogPostBody({
  title,
  imageUrl,
  bodyHtml,
  publishedAt,
  avatarUrl,
}: {
  title: string;
  imageUrl: string | null;
  bodyHtml: string;
  publishedAt: string | null;
  avatarUrl: string | null;
}) {
  return (
    <>
      <div className="bg-base-200 relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-box">
        {imageUrl ? (
          // object-contain: the full image matters more than filling the box here.
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
          <img src={imageUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="from-primary to-secondary h-full w-full bg-gradient-to-br" aria-hidden="true" />
        )}
      </div>

      <h1 className="mt-6 text-3xl leading-tight font-bold">{title}</h1>
      <div className="mt-3">
        <BlogPostMeta post={{ publishedAt: publishedAt ?? nowIso(), bodyHtml, avatarUrl }} tone="dark" />
      </div>

      {/* Trusted HTML: only written by the ADMIN_EMAIL-gated admin UI. Styled
          via descendant selectors since no typography plugin is installed. */}
      <div
        className="text-base-content mt-8 max-w-none [&_a]:link [&_a]:text-info [&_blockquote]:border-base-300 [&_blockquote]:text-base-content/70 [&_blockquote]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-base-200 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-box [&_img]:my-4 [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_pre]:bg-base-200 [&_pre]:rounded-box [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:p-4 [&_strong]:font-semibold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: autoParagraphs(bodyHtml) }}
      />
    </>
  );
}
