import { notFound } from "next/navigation";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { resolvePostBySlug } from "@/features/blog/services/blogPosts";
import BlogPostForm from "@/features/blog/components/BlogPostForm";

export default async function EditBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminUser())) notFound();

  const { slug } = await params;
  const post = await resolvePostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-lg font-semibold">Edit post</h1>
        <BlogPostForm post={post} />
      </div>
    </main>
  );
}
