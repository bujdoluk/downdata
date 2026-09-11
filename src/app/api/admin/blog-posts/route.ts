import { NextResponse } from "next/server";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { createPost } from "@/features/blog/services/blogPosts";
import { slugify } from "@/lib/slugify";

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml.trim() : "";
  const rawSlug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  if (!title || !bodyHtml) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const slug = slugify(rawSlug || title);
  if (!slug) {
    return NextResponse.json({ error: "Couldn't derive a valid slug from that title." }, { status: 400 });
  }

  try {
    const post = await createPost({ title, slug, bodyHtml, imageUrl });
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken. Try a different one." }, { status: 409 });
    }
    throw error;
  }
}
