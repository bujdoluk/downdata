import { notFound } from "next/navigation";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import GoBackLink from "@/features/blog/components/GoBackLink";
import BlogPostForm from "@/features/blog/components/BlogPostForm";

export default async function NewBlogPostPage() {
  if (!(await isAdminUser())) notFound();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-6xl lg:flex lg:flex-col">
        <GoBackLink href="/admin/blog" />
        <h1 className="mb-6 text-lg font-semibold">New post</h1>
        <BlogPostForm />
      </div>
    </main>
  );
}
