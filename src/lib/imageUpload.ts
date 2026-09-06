import type { SupabaseClient } from "@supabase/supabase-js";
import { nowMs } from "@/lib/formatTime";

// Shared by components/account/AvatarUpload.tsx and
// components/statusPage/StatusPageLogoUpload.tsx — same validation rules
// and the same fixed-path-upsert-then-cache-busted-URL upload shape,
// against two different public Storage buckets.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Every format that reliably renders via <img src> in all major browsers.
// Deliberately excludes formats a browser will still tag as "image/*" but
// won't actually display that way — HEIC/HEIF (Safari-only), TIFF, JPEG
// 2000 — which would let the upload succeed while the image shows broken
// almost everywhere.
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon", // the other MIME type browsers/OSes report for .ico, alongside image/x-icon
];

// The i18n key to show (nav.avatarInvalidType/nav.avatarTooLarge, reused
// verbatim by both callers rather than each carrying its own copy), or
// null if the file is fine to upload.
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "nav.avatarInvalidType";
  if (file.size > MAX_IMAGE_BYTES) return "nav.avatarTooLarge";
  return null;
}

// Upserts onto a fixed path in a public Storage bucket (a re-upload
// overwrites the same key rather than piling up old files) and returns a
// cache-busted public URL — the path staying stable means the browser
// would otherwise keep showing the previous image at the same URL.
export async function uploadImageToBucket(supabase: SupabaseClient, bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${nowMs()}`;
}
