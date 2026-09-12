import { NextResponse } from "next/server";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { updatePost, deletePost, setPostPublished } from "@/features/blog/services/blogPosts";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { slug } = await params;
  const body = await request.json().catch(() => null);

  // Publish/unpublish is its own branch, not merged with the content
  // fields below — a publish-toggle click sends only `{ published }`, with
  // no title/body/image to (accidentally) overwrite.
  if (typeof body?.published === "boolean") {
    const post = await setPostPublished(slug, body.published);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json(post);
  }

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml.trim() : "";
  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  const avatarUrl = typeof body?.avatarUrl === "string" && body.avatarUrl.trim() ? body.avatarUrl.trim() : null;

  if (!title || !bodyHtml) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const post = await updatePost(slug, { title, bodyHtml, imageUrl, avatarUrl });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json(post);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { slug } = await params;
  const deleted = await deletePost(slug);
  if (!deleted) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
