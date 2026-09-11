"use client";

import { useId, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { requestJson } from "@/lib/fetchJson";
import { slugify } from "@/lib/slugify";
import Spinner from "@/components/Spinner";
import type { BlogPost } from "@/features/blog/types";

// Internal admin tooling (ADMIN_EMAIL-gated, see requireAdminUser.ts) —
// deliberately plain English throughout, not run through the 13-locale
// i18n system the rest of this app's user-facing strings go through. The
// only person who will ever see this is the site owner.
export default function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const isEditing = Boolean(post);
  const [title, setTitle] = useState(post?.title ?? "");
  // Once a post exists, its slug is the primary key and isn't editable
  // here (see updatePost's own comment) — only a create-mode draft slug
  // auto-follows the title as it's typed.
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [bodyHtml, setBodyHtml] = useState(post?.bodyHtml ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(post?.imageUrl ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputId = useId();

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!isEditing && !slugTouched) setSlug(slugify(value));
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/blog-images", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
      return data.imageUrl as string;
    },
    onSuccess: setImageUrl,
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError(null);
    uploadMutation.reset();
    uploadMutation.mutate(file, { onError: (error) => setUploadError(error.message) });
  }

  const saveMutation = useMutation({
    // Branching on `post` itself, not the derived `isEditing` boolean, so
    // TypeScript narrows it directly instead of needing a `post!` assertion.
    mutationFn: () =>
      post
        ? requestJson<BlogPost>(`/api/admin/blog-posts/${post.slug}`, "Couldn't save the post.", {
            method: "PATCH",
            body: { title, bodyHtml, imageUrl },
          })
        : requestJson<BlogPost>("/api/admin/blog-posts", "Couldn't create the post.", {
            method: "POST",
            body: { title, slug, bodyHtml, imageUrl },
          }),
    onSuccess: () => {
      router.push("/admin/blog");
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  const uploading = uploadMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="fieldset">
        <span className="fieldset-legend">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input input-bordered w-full"
          required
        />
      </label>

      <label className="fieldset">
        <span className="fieldset-legend">Slug</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          disabled={isEditing}
          className="input input-bordered w-full disabled:opacity-60"
          required
        />
        {!isEditing && (
          <span className="label text-xs">Used in the URL — /blog/{slug || "your-slug"}. Can&apos;t be changed after creating.</span>
        )}
      </label>

      <div className="fieldset">
        <span className="fieldset-legend">Background image</span>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
            <img src={imageUrl} alt="" className="h-16 w-24 rounded object-cover" />
          ) : (
            <div className="bg-base-200 h-16 w-24 rounded" aria-hidden="true" />
          )}
          <label htmlFor={fileInputId} className={`btn btn-sm ${uploading ? "btn-disabled" : ""}`}>
            {uploading ? <Spinner size="xs" /> : "Choose image"}
          </label>
          <input id={fileInputId} type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
          {imageUrl && (
            <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setImageUrl(null)} disabled={uploading}>
              Remove
            </button>
          )}
        </div>
        <span className="label text-xs">Optional — falls back to a plain gradient when not set.</span>
        {uploadError && <p className="text-error text-xs">{uploadError}</p>}
      </div>

      <label className="fieldset">
        <span className="fieldset-legend">Body (HTML)</span>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          rows={16}
          className="textarea textarea-bordered w-full font-mono text-sm"
          required
        />
      </label>

      {saveMutation.isError && <p className="text-error text-sm">{saveMutation.error.message}</p>}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push("/admin/blog")} className="btn btn-sm">
          Cancel
        </button>
        <button type="submit" disabled={saveMutation.isPending || uploading} className="btn btn-info btn-sm">
          {saveMutation.isPending ? <Spinner size="xs" /> : isEditing ? "Save changes" : "Create post"}
        </button>
      </div>
    </form>
  );
}
