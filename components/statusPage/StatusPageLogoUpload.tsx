"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { nowMs } from "@/lib/formatTime";
import Spinner from "@/components/Spinner";

// Same validation/upload shape as components/account/AvatarUpload.tsx —
// see that file's own comments for why these particular formats/limits.
// Unlike AvatarUpload, this doesn't persist logoUrl anywhere itself: it
// only writes to Storage and hands the new URL back via onChange, since
// this control lives inside BoardStatusPageSettings' single save-together
// form rather than a page of independently-instant-saving widgets.
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export default function StatusPageLogoUpload({
  supabase,
  boardId,
  logoUrl,
  onChange,
}: {
  supabase: SupabaseClient;
  boardId: string;
  logoUrl: string | null;
  onChange: (logoUrl: string | null) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fixed path per board (not per user, unlike avatars) — a re-upload is
  // then a plain upsert onto the same key, matching the RLS ownership
  // check in 0025_board_status_pages.sql, which reads this same segment.
  const path = `${boardId}/logo`;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { error: uploadError } = await supabase.storage
        .from("status-page-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      // Cache-bust: the path is stable per board, so without this the
      // browser would keep showing the previous image at the same URL.
      const { data } = supabase.storage.from("status-page-logos").getPublicUrl(path);
      return `${data.publicUrl}?t=${nowMs()}`;
    },
    onSuccess: onChange,
  });

  const uploading = uploadMutation.isPending;
  const error = validationError ? t(validationError) : uploadMutation.isError ? t("boards.statusPage.logoUploadFailed") : null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setValidationError(null);
    uploadMutation.reset();
    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError("nav.avatarInvalidType");
      return;
    }
    if (file.size > MAX_BYTES) {
      setValidationError("nav.avatarTooLarge");
      return;
    }

    uploadMutation.mutate(file);
  }

  return (
    <fieldset className="fieldset p-0">
      <legend className="fieldset-legend text-xs font-semibold tracking-wide text-base-content/60 uppercase">
        {t("boards.statusPage.logoLabel")}
      </legend>

      <div className="flex items-center gap-3">
        {logoUrl ? (
          <div className="avatar">
            <div className="bg-base-100 w-12 rounded-full border">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a fixed set of domains next/image can allowlist */}
              <img src={logoUrl} alt="" />
            </div>
          </div>
        ) : (
          <div className="avatar avatar-placeholder">
            <div className="bg-neutral text-neutral-content w-12 rounded-full text-xs">dD</div>
          </div>
        )}

        <div className="flex flex-1 items-center gap-2">
          <label htmlFor={inputId} className={`btn btn-sm ${uploading ? "btn-disabled" : ""}`}>
            {uploading ? <Spinner size="xs" /> : t("boards.statusPage.logoChoose")}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          {logoUrl && (
            <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => onChange(null)} disabled={uploading}>
              {t("boards.statusPage.logoRemove")}
            </button>
          )}
        </div>
      </div>

      <p className="label">{t("boards.statusPage.logoHint")}</p>
      {error && <p className="text-error text-xs">{error}</p>}
    </fieldset>
  );
}
