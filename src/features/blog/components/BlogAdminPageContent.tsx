"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { requestJson } from "@/lib/fetchJson";
import { formatDateTime } from "@/lib/formatTime";
import { useTimeZone } from "@/hooks/useTimeZone";
import Spinner from "@/components/Spinner";
import ModalCloseButton from "@/components/ModalCloseButton";
import type { BlogPost } from "@/features/blog/types";

// Internal admin tooling — see BlogPostForm.tsx's own comment on why this
// is plain English, not run through i18n.
export default function BlogAdminPageContent({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const timeZone = useTimeZone();
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const pendingDeleteSlug = useRef<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: ({ slug, published }: { slug: string; published: boolean }) =>
      requestJson<BlogPost>(`/api/admin/blog-posts/${slug}`, "Couldn't update the post.", {
        method: "PATCH",
        body: { published },
      }),
    onSuccess: () => router.refresh(),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => fetch(`/api/admin/blog-posts/${slug}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (!res.ok) return;
      deleteDialogRef.current?.close();
      router.refresh();
    },
  });

  function confirmDelete(slug: string) {
    pendingDeleteSlug.current = slug;
    deleteDialogRef.current?.showModal();
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Manage blog</h1>
        <Link href="/admin/blog/new" className="btn btn-info btn-sm">
          + New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-base-content/50 mt-8 text-sm">No posts yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isBusy =
                  (publishMutation.isPending && publishMutation.variables?.slug === post.slug) ||
                  (deleteMutation.isPending && deleteMutation.variables === post.slug);
                return (
                  <tr key={post.slug}>
                    <td className="max-w-xs truncate">{post.title}</td>
                    <td>
                      <span className={`badge badge-sm ${post.publishedAt ? "badge-success" : "badge-ghost"}`}>
                        {post.publishedAt ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="text-base-content/60 text-xs">{formatDateTime(post.createdAt, timeZone)}</td>
                    <td className="flex justify-end gap-1.5">
                      <Link href={`/admin/blog/${post.slug}/edit`} className="btn btn-ghost btn-xs">
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => publishMutation.mutate({ slug: post.slug, published: !post.publishedAt })}
                        className="btn btn-ghost btn-xs"
                      >
                        {isBusy && publishMutation.isPending ? <Spinner size="xs" /> : post.publishedAt ? "Unpublish" : "Publish"}
                      </button>
                      <button type="button" onClick={() => confirmDelete(post.slug)} className="btn btn-ghost btn-xs text-error">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <dialog ref={deleteDialogRef} className="modal">
        <div className="modal-box relative">
          <ModalCloseButton />
          <h3 className="text-lg font-bold">Delete post?</h3>
          <p className="text-base-content/70 mt-2 text-sm">This can&apos;t be undone.</p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => pendingDeleteSlug.current && deleteMutation.mutate(pendingDeleteSlug.current)}
                className="btn btn-error btn-sm"
              >
                {deleteMutation.isPending ? <Spinner size="xs" /> : "Delete"}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Cancel</button>
        </form>
      </dialog>
    </div>
  );
}
