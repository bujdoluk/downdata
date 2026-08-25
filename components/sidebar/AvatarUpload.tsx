"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { UserIcon } from "@/components/icons/NavIcons";

const MAX_BYTES = 2 * 1024 * 1024;

export default function AvatarUpload({
  supabase,
  userId,
  avatarUrl,
  onChange,
}: {
  supabase: SupabaseClient;
  userId: string;
  avatarUrl: string | null;
  onChange: (avatarUrl: string | null) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fixed path per user, no extension (contentType is set explicitly on
  // upload, so the URL doesn't need one) — re-uploading is then a plain
  // upsert onto the same key instead of piling up old files to clean up.
  const path = `${userId}/avatar`;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t("nav.avatarInvalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("nav.avatarTooLarge"));
      return;
    }

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      // Cache-bust: the path is stable per user, so without this the
      // browser would keep showing the previous image at the same URL.
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: newUrl } });
      if (updateError) throw updateError;

      onChange(newUrl);
    } catch {
      setError(t("nav.avatarUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const { error: removeError } = await supabase.storage.from("avatars").remove([path]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: null } });
      if (updateError) throw updateError;

      onChange(null);
    } catch {
      setError(t("nav.avatarUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <div className="avatar">
            <div className="w-12 rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist */}
              <img src={avatarUrl} alt="" />
            </div>
          </div>
        ) : (
          <div className="avatar avatar-placeholder">
            <div className="bg-neutral text-neutral-content w-12 rounded-full">
              <UserIcon className="h-6 w-6" />
            </div>
          </div>
        )}

        <div className="flex flex-1 items-center gap-2">
          {/* Native file input text ("Choose File"/"No file chosen") comes
              from the browser's own locale, not the app's — can't be
              translated via CSS, so it's hidden behind a label carrying
              our own translated text instead. */}
          <label htmlFor={inputId} className={`btn btn-sm flex-1 ${uploading ? "btn-disabled" : ""}`}>
            {t("nav.avatarChoose")}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          {avatarUrl && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemove} disabled={uploading}>
              {t("nav.avatarRemove")}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-error mt-2 text-xs">{error}</p>}
    </div>
  );
}
