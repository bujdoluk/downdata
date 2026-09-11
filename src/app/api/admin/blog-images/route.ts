import { NextResponse } from "next/server";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { getSupabaseClient } from "@/lib/supabase";
import { validateImageFile, uploadImageToBucket } from "@/lib/imageUpload";
import { nowMs } from "@/lib/formatTime";

// Unlike avatars/status-page-logos, this doesn't upload directly from the
// browser to Storage — the blog-images bucket has no insert policy for
// `authenticated` at all (see the 0035 migration's own comment), since
// there's no per-user auth.uid() ownership to check for a bucket with
// exactly one writer. This route is that writer: it authorizes via
// ADMIN_EMAIL, then uploads with the service-role client, which bypasses
// Storage RLS the same way it bypasses table RLS everywhere else in this
// app.
export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const validationKey = validateImageFile(file);
  if (validationKey) {
    return NextResponse.json({ error: "That file isn't a supported image or is too large." }, { status: 400 });
  }

  // A fresh path per upload, not a fixed per-post one — a post's slug may
  // not exist yet (uploading before the create form is ever submitted),
  // so there's no stable key to upsert onto the way avatars/status-page-
  // logos do. The old object is simply left orphaned in Storage on a
  // re-upload, an acceptable tradeoff for a single-admin, low-volume bucket.
  const path = `posts/${nowMs()}-${file.name}`;
  const imageUrl = await uploadImageToBucket(getSupabaseClient(), "blog-images", path, file);
  return NextResponse.json({ imageUrl });
}
