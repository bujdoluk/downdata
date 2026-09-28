import { NextResponse } from "next/server";
import { isAdminUser } from "@/features/blog/services/requireAdminUser";
import { getSupabaseClient } from "@/lib/supabase";
import { validateImageFile, uploadImageToBucket } from "@/lib/imageUpload";
import { nowMs } from "@/lib/formatTime";

// The blog-images bucket has no insert policy for `authenticated`, so this route is its only writer:
// it checks ADMIN_EMAIL, then uploads with the service-role client.
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

  // Fresh path per upload since the post may not exist yet; orphaned objects are acceptable here.
  const path = `posts/${nowMs()}-${file.name}`;
  const imageUrl = await uploadImageToBucket(getSupabaseClient(), "blog-images", path, file);
  return NextResponse.json({ imageUrl });
}
