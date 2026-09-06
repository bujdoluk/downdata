"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { validateImageFile, uploadImageToBucket } from "@/lib/imageUpload";
import Spinner from "@/components/Spinner";
import Logo from "@/components/navbar/Logo";

// Same validation/upload shape as components/account/AvatarUpload.tsx —
// both now share lib/imageUpload.ts for that part. Unlike AvatarUpload,
// this doesn't persist logoUrl anywhere itself: it only writes to Storage
// and hands the new URL back via onChange, since this control lives
// inside BoardStatusPageSettings' single save-together form rather than a
// page of independently-instant-saving widgets.

export default function StatusPageLogoUpload({
  supabase,
  boardId,
  logoUrl,
  hideBranding,
  onChange,
}: {
  supabase: SupabaseClient;
  boardId: string;
  logoUrl: string | null;
  hideBranding: boolean;
  onChange: (logoUrl: string | null) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Path is <user_id>/<board_id>/logo, not just <board_id>/logo — the RLS
  // ownership check (0026_fix_status_page_logo_rls.sql) compares the
  // path's first segment directly against auth.uid(), the same flat
  // comparison the avatars bucket uses, rather than looking the board up
  // in another table (see that migration for why the board-lookup shape
  // reliably failed). A re-upload is still a plain upsert onto the same
  // key either way.
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error("Not signed in.");
      return uploadImageToBucket(supabase, "status-page-logos", `${user.id}/${boardId}/logo`, file);
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
    const validationKey = validateImageFile(file);
    if (validationKey) {
      setValidationError(validationKey);
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
        ) : hideBranding ? (
          // Matches PublicStatusPageContent exactly: no custom logo + hidden
          // branding means the public page's header renders no mark at all —
          // an empty dashed circle here says that plainly, instead of the
          // downDATA mark below, which would misleadingly suggest it'll show.
          <div className="avatar avatar-placeholder">
            <div className="border-base-content/20 w-12 rounded-full border border-dashed" />
          </div>
        ) : (
          <div className="avatar avatar-placeholder">
            <div className="bg-base-100 flex w-12 items-center justify-center rounded-full border">
              <Logo className="h-8 w-8" />
            </div>
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
