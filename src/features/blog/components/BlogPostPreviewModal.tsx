"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import ModalCloseButton from "@/components/ModalCloseButton";
import BlogPostBody from "@/features/blog/components/BlogPostBody";

export type BlogPostPreviewModalHandle = {
  open: (post: PreviewData) => void;
};

type PreviewData = { title: string; imageUrl: string | null; bodyHtml: string; publishedAt: string | null; avatarUrl: string | null };

// Shared by BlogPostForm (previewing whatever's currently typed, saved or
// not) and BlogAdminPageContent (previewing an already-saved row from the
// list) — one dialog, its content swapped per open() call, same pattern as
// BlogAdminPageContent's own delete-confirmation dialog. Large/scrollable
// rather than the delete dialog's compact footprint — this one's showing
// the whole post, not a one-line confirmation.
const BlogPostPreviewModal = forwardRef<BlogPostPreviewModalHandle>(function BlogPostPreviewModal(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<PreviewData | null>(null);

  useImperativeHandle(ref, () => ({
    open(post) {
      setData(post);
      dialogRef.current?.showModal();
    },
  }));

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box relative max-h-[90vh] w-11/12 max-w-3xl overflow-y-auto">
        <ModalCloseButton />
        {data && (
          <BlogPostBody
            title={data.title}
            imageUrl={data.imageUrl}
            bodyHtml={data.bodyHtml}
            publishedAt={data.publishedAt}
            avatarUrl={data.avatarUrl}
          />
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>Cancel</button>
      </form>
    </dialog>
  );
});

export default BlogPostPreviewModal;
