"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { requestJson } from "@/lib/fetchJson";
import { slugify } from "@/lib/slugify";
import Spinner from "@/components/Spinner";
import BlogPostPreviewModal, { type BlogPostPreviewModalHandle } from "@/features/blog/components/BlogPostPreviewModal";
import { buildVideoEmbedHtml } from "@/features/blog/services/videoEmbed";
import type { BlogPost } from "@/features/blog/types";

// Shared by the cover-image upload, the Avatar upload, and the body's
// "Insert image" button — same endpoint/validation either way, they just do
// different things with the resulting URL.
async function uploadBlogImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/blog-images", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
  return data.imageUrl as string;
}

// New-post-only (see the isEditing guards around every use of this below) —
// an existing post already has a persisted, authoritative version in the
// database, so restoring a possibly-stale local draft over freshly-loaded
// server data would be a real conflict, not a convenience. A brand-new,
// never-saved post has nothing else to lose it to.
const NEW_POST_DRAFT_KEY = "blogDraft:new:v1";

type NewPostDraft = {
  title: string;
  slug: string;
  bodyHtml: string;
  imageUrl: string | null;
  avatarUrl: string | null;
};

function clearNewPostDraft() {
  try {
    localStorage.removeItem(NEW_POST_DRAFT_KEY);
  } catch {
    // ignore — Safari private mode can throw here
  }
}

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(post?.avatarUrl ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [bodyToolError, setBodyToolError] = useState<string | null>(null);
  const fileInputId = useId();
  const avatarFileInputId = useId();
  const bodyImageInputId = useId();
  const previewRef = useRef<BlogPostPreviewModalHandle>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!isEditing && !slugTouched) setSlug(slugify(value));
  }

  // Restores an in-progress new-post draft after a refresh — read once on
  // mount, same try/catch-and-ignore convention as Sidebar.tsx's own
  // localStorage use (Safari private mode can throw on access, not just on
  // a missing key).
  useEffect(() => {
    if (isEditing) return;
    try {
      const raw = localStorage.getItem(NEW_POST_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as NewPostDraft;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(draft.title);
      setSlug(draft.slug);
      setSlugTouched(Boolean(draft.slug));
      setBodyHtml(draft.bodyHtml);
      setImageUrl(draft.imageUrl);
      setAvatarUrl(draft.avatarUrl);
    } catch {
      // ignore
    }
    // Only ever runs once, right after mount — isEditing/setters are stable
    // for the lifetime of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ...and saves it back on every change thereafter, so a refresh mid-draft
  // has something to restore.
  useEffect(() => {
    if (isEditing) return;
    try {
      const draft: NewPostDraft = { title, slug, bodyHtml, imageUrl, avatarUrl };
      localStorage.setItem(NEW_POST_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [isEditing, title, slug, bodyHtml, imageUrl, avatarUrl]);

  // Inserts at the textarea's current cursor position (falling back to the
  // end if it's not focused) rather than always appending — both the
  // "Insert image" and "Insert video" buttons are meant to drop their
  // snippet wherever you're actually writing.
  function insertAtCursor(snippet: string) {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBodyHtml((prev) => prev + snippet);
      return;
    }
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    setBodyHtml((prev) => prev.slice(0, start) + snippet + prev.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + snippet.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  const uploadMutation = useMutation({
    mutationFn: uploadBlogImage,
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

  const avatarUploadMutation = useMutation({
    mutationFn: uploadBlogImage,
    onSuccess: setAvatarUrl,
  });

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarUploadError(null);
    avatarUploadMutation.reset();
    avatarUploadMutation.mutate(file, { onError: (error) => setAvatarUploadError(error.message) });
  }

  const insertImageMutation = useMutation({
    mutationFn: uploadBlogImage,
    onSuccess: (uploadedUrl) => insertAtCursor(`<img src="${uploadedUrl}" alt="">`),
  });

  function handleBodyImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBodyToolError(null);
    insertImageMutation.reset();
    insertImageMutation.mutate(file, { onError: (error) => setBodyToolError(error.message) });
  }

  // Plain window.prompt, not a styled input — matches this form's own
  // "deliberately minimal, single-user tooling" philosophy for a one-off
  // action rather than something worth its own UI chrome.
  function handleInsertVideo() {
    const url = window.prompt("Paste a YouTube or Vimeo link");
    if (!url) return;
    const embedHtml = buildVideoEmbedHtml(url);
    if (!embedHtml) {
      setBodyToolError("That doesn't look like a YouTube or Vimeo link.");
      return;
    }
    setBodyToolError(null);
    insertAtCursor(embedHtml);
  }

  const saveMutation = useMutation({
    // Branching on `post` itself, not the derived `isEditing` boolean, so
    // TypeScript narrows it directly instead of needing a `post!` assertion.
    mutationFn: () =>
      post
        ? requestJson<BlogPost>(`/api/admin/blog-posts/${post.slug}`, "Couldn't save the post.", {
            method: "PATCH",
            body: { title, bodyHtml, imageUrl, avatarUrl },
          })
        : requestJson<BlogPost>("/api/admin/blog-posts", "Couldn't create the post.", {
            method: "POST",
            body: { title, slug, bodyHtml, imageUrl, avatarUrl },
          }),
    onSuccess: () => {
      // Only the create path has a draft to clear — clearing unconditionally
      // here would also wipe an unrelated, still-in-progress new-post draft
      // whenever an *edit* save happens to succeed afterward.
      if (!isEditing) clearNewPostDraft();
      router.push("/admin/blog");
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  const uploading = uploadMutation.isPending;
  const avatarUploading = avatarUploadMutation.isPending;

  return (
    // Fragment, not just the <form> itself: BlogPostPreviewModal renders its
    // own <dialog>/<form method="dialog">s, and HTML doesn't allow a <form>
    // nested inside another <form> — it has to be a sibling, not a child.
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
        {/* lg:flex-row, not grid-cols-2 — the Body column needs to be a
            flex-col itself so its textarea can flex-1 into whatever height
            this row ends up with; CSS grid's own row tracks size to content
            (grid-auto-rows: max-content, including on daisyUI's own
            .fieldset) regardless of the grid container's height, which
            would silently defeat the "fill remaining viewport" chain below
            if this stayed a grid. Unscoped on mobile — same stacked, plain-
            scrolling layout as before there. */}
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          <div className="flex flex-col gap-4 lg:w-1/2">
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
                <span className="label text-xs">
                  Used in the URL — /blog/{slug || "your-slug"}. Can&apos;t be changed after creating.
                </span>
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
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                {imageUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => setImageUrl(null)}
                    disabled={uploading}
                  >
                    Remove
                  </button>
                )}
              </div>
              <span className="label text-xs">Optional. Falls back to a plain gradient when not set.</span>
              {uploadError && <p className="text-error text-xs">{uploadError}</p>}
            </div>

            <div className="fieldset">
              <span className="fieldset-legend">Avatar</span>
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist
                  <img src={avatarUrl} alt="" className="h-16 w-24 rounded object-cover" />
                ) : (
                  <div className="bg-base-200 h-16 w-24 rounded" aria-hidden="true" />
                )}
                <label htmlFor={avatarFileInputId} className={`btn btn-sm ${avatarUploading ? "btn-disabled" : ""}`}>
                  {avatarUploading ? <Spinner size="xs" /> : "Choose image"}
                </label>
                <input
                  id={avatarFileInputId}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  disabled={avatarUploading}
                  className="hidden"
                />
                {avatarUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => setAvatarUrl(null)}
                    disabled={avatarUploading}
                  >
                    Remove
                  </button>
                )}
              </div>
              <span className="label text-xs">Optional. Falls back to the downDATA logo when not set.</span>
              {avatarUploadError && <p className="text-error text-xs">{avatarUploadError}</p>}
            </div>
          </div>

          <label className="fieldset lg:flex lg:w-1/2 lg:min-h-0 lg:flex-col">
            <span className="fieldset-legend">Body (HTML)</span>
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor={bodyImageInputId} className={`btn btn-xs ${insertImageMutation.isPending ? "btn-disabled" : ""}`}>
                {insertImageMutation.isPending ? <Spinner size="xs" /> : "Insert image"}
              </label>
              <input
                id={bodyImageInputId}
                type="file"
                accept="image/*"
                onChange={handleBodyImageFileChange}
                disabled={insertImageMutation.isPending}
                className="hidden"
              />
              <button type="button" onClick={handleInsertVideo} className="btn btn-xs">
                Insert video
              </button>
            </div>
            <textarea
              ref={bodyTextareaRef}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={16}
              className="textarea textarea-bordered w-full flex-1 font-mono text-sm lg:min-h-0"
              required
            />
            {bodyToolError && <p className="text-error text-xs">{bodyToolError}</p>}
            <span className="label text-xs">
              Plain-text paragraphs (blank line between them) work fine. Real HTML tags are used as-is if you write them.
            </span>
          </label>
        </div>

        {saveMutation.isError && <p className="text-error text-sm">{saveMutation.error.message}</p>}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              clearNewPostDraft();
              router.push("/admin/blog");
            }}
            className="btn btn-sm"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                previewRef.current?.open({ title, imageUrl, bodyHtml, publishedAt: post?.publishedAt ?? null, avatarUrl })
              }
            >
              Preview
            </button>
            <button type="submit" disabled={saveMutation.isPending || uploading} className="btn btn-info btn-sm">
              {saveMutation.isPending ? <Spinner size="xs" /> : isEditing ? "Save changes" : "Create post"}
            </button>
          </div>
        </div>
      </form>

      <BlogPostPreviewModal ref={previewRef} />
    </>
  );
}
