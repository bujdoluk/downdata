import { notFound } from "next/navigation";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { getAllPosts } from "@/features/blog/services/blogPosts";
import BlogAdminPageContent from "@/features/blog/components/BlogAdminPageContent";

// proxy.ts only requires a login; this check is the real admin boundary.
export default async function BlogAdminPage() {
  if (!(await isAdminUser())) notFound();

  const posts = await getAllPosts();
  return (
    <main className="flex flex-1 justify-center p-6">
      <BlogAdminPageContent posts={posts} />
    </main>
  );
}
