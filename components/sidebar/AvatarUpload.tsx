"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
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
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fixed path per user, no extension (contentType is set explicitly on
  // upload, so the URL doesn't need one) — re-uploading is then a plain
  // upsert onto the same key instead of piling up old files to clean up.
  const path = `${userId}/avatar`;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
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

      return newUrl;
    },
    onSuccess: (newUrl) => onChange(newUrl),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error: removeError } = await supabase.storage.from("avatars").remove([path]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: null } });
      if (updateError) throw updateError;
    },
    onSuccess: () => onChange(null),
  });

  const uploading = uploadMutation.isPending || removeMutation.isPending;
  const error = validationError ? t(validationError) : uploadMutation.isError || removeMutation.isError ? t("nav.avatarUploadFailed") : null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setValidationError(null);
    uploadMutation.reset();
    if (!file.type.startsWith("image/")) {
      setValidationError("nav.avatarInvalidType");
      return;
    }
    if (file.size > MAX_BYTES) {
      setValidationError("nav.avatarTooLarge");
      return;
    }

    uploadMutation.mutate(file);
  }

  function handleRemove() {
    setValidationError(null);
    removeMutation.mutate();
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
