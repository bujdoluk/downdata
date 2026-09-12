import { notFound } from "next/navigation";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";
import BlogPostForm from "@/features/blog/components/BlogPostForm";

export default async function NewBlogPostPage() {
  if (!(await isAdminUser())) notFound();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="flex w-full flex-col">
        <PageHeader back={<BackLink fallbackHref="/admin/blog" label="← Back" />}>
          <h1 className="text-lg font-semibold">New post</h1>
        </PageHeader>

        <div className="mx-auto w-full max-w-6xl lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <BlogPostForm />
        </div>
      </div>
    </main>
  );
}
