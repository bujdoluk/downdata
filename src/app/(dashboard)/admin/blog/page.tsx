import { notFound } from "next/navigation";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { getAllPosts } from "@/features/blog/services/blogPosts";
import BlogAdminPageContent from "@/features/blog/components/BlogAdminPageContent";

// Not linked from anywhere (sidebar, footer, or otherwise) and not in
// proxy.ts's public allowlist, so it's already behind a normal login by
// default — this check is the real boundary, restricting it further to
// just the site owner. See requireAdminUser.ts.
export default async function BlogAdminPage() {
  if (!(await isAdminUser())) notFound();

  const posts = await getAllPosts();
  return (
    <main className="flex flex-1 justify-center p-6">
      <BlogAdminPageContent posts={posts} />
    </main>
  );
}
