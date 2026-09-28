import type { SupabaseClient } from "@supabase/supabase-js";
import { nowMs } from "@/lib/formatTime";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Excludes formats tagged image/* that most browsers can't display (HEIC, TIFF, JPEG 2000).
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon", // alternate .ico MIME type some OSes report
];

// Returns an i18n key, or null if the file is fine.
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "nav.avatarInvalidType";
  if (file.size > MAX_IMAGE_BYTES) return "nav.avatarTooLarge";
  return null;
}

// Fixed path overwrites the old file, so the URL is cache-busted.
export async function uploadImageToBucket(supabase: SupabaseClient, bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${nowMs()}`;
}
