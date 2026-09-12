"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import ModalCloseButton from "@/components/ModalCloseButton";
import BlogPostBody from "@/features/blog/components/BlogPostBody";
import BlogCardBody from "@/features/blog/components/BlogCardBody";

export type BlogPostPreviewModalHandle = {
  open: (post: PreviewData) => void;
};

type PreviewData = { title: string; imageUrl: string | null; bodyHtml: string; publishedAt: string | null; avatarUrl: string | null };

const BlogPostPreviewModal = forwardRef<BlogPostPreviewModalHandle>(function BlogPostPreviewModal(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<PreviewData | null>(null);
  const [view, setView] = useState<"post" | "card">("post");

  useImperativeHandle(ref, () => ({
    open(post) {
      setData(post);
      setView("post");
      dialogRef.current?.showModal();
    },
  }));

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box relative h-[90vh] w-11/12 max-w-3xl overflow-y-auto">
        <ModalCloseButton />

        <div role="tablist" className="tabs tabs-box tabs-sm w-fit">
          <button
            type="button"
            role="tab"
            className={`tab w-28 ${view === "post" ? "tab-active" : ""}`}
            onClick={() => setView("post")}
          >
            Post
          </button>
          <button
            type="button"
            role="tab"
            className={`tab w-28 ${view === "card" ? "tab-active" : ""}`}
            onClick={() => setView("card")}
          >
            Card
          </button>
        </div>

        {data &&
          (view === "post" ? (
            <BlogPostBody
              title={data.title}
              imageUrl={data.imageUrl}
              bodyHtml={data.bodyHtml}
              publishedAt={data.publishedAt}
              avatarUrl={data.avatarUrl}
            />
          ) : (
            <div className="mt-6 flex justify-center">
              <div className="card aspect-[4/3] w-[360px] overflow-hidden shadow-md">
                <BlogCardBody
                  title={data.title}
                  imageUrl={data.imageUrl}
                  publishedAt={data.publishedAt}
                  bodyHtml={data.bodyHtml}
                  avatarUrl={data.avatarUrl}
                />
              </div>
            </div>
          ))}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>Cancel</button>
      </form>
    </dialog>
  );
});

export default BlogPostPreviewModal;
