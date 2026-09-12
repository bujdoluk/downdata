import { notFound } from "next/navigation";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { resolvePostBySlug } from "@/features/blog/services/blogPosts";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";
import BlogPostForm from "@/features/blog/components/BlogPostForm";

export default async function EditBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminUser())) notFound();

  const { slug } = await params;
  const post = await resolvePostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="flex w-full flex-col">
        <PageHeader back={<BackLink fallbackHref="/admin/blog" label="← Back" />}>
          <h1 className="text-lg font-semibold">Edit post</h1>
        </PageHeader>

        <div className="mx-auto w-full max-w-6xl lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <BlogPostForm post={post} />
        </div>
      </div>
    </main>
  );
}
