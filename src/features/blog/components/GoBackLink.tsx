"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons/NavIcons";

// Same router.back() + ArrowLeftIcon convention as LoginForm's own "Go
// back", shared by /admin/blog (BlogAdminPageContent) and /admin/blog/new —
// both reached only by clicking a link (the sidebar's "Blog admin", or "+
// New post"), so history is always meaningful. /admin/blog/[slug]/edit
// doesn't get this: it already has "Cancel".
export default function GoBackLink() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="link link-hover text-base-content/60 mb-4 flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon />
      Go back
    </button>
  );
}
