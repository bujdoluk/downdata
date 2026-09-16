"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { validateImageFile, uploadImageToBucket } from "@/lib/imageUpload";
import Spinner from "@/components/Spinner";
import Logo from "@/components/navbar/Logo";
import { InfoIcon } from "@/components/icons/NavIcons";

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
      {/* invisible, not removed — reserves the same vertical space a real
          fieldset-legend takes (see the slug/company-name fieldsets this
          sits beside), so the avatar+button row lines up with the public
          URL input instead of starting higher now that this fieldset has
          no visible label of its own. visibility:hidden takes it out of
          the accessibility tree too, so it's not a confusing blank legend
          for screen reader users. */}
      <legend className="fieldset-legend invisible" aria-hidden="true">
        {" "}
      </legend>
      <div className="flex items-center justify-center gap-3">
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

        <div className="flex items-center gap-2">
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
          {/* button, not a bare span — a span can never receive keyboard
              focus, so a keyboard-only user had no way to trigger this
              tooltip at all; aria-label gives it a real accessible name
              too, since data-tip's CSS-only content isn't read by screen
              readers (see ComponentFilterDropdown.tsx's identical pattern). */}
          <button type="button" className="tooltip" data-tip={t("boards.statusPage.logoHint")} aria-label={t("boards.statusPage.logoHint")}>
            <InfoIcon className="text-base-content/40" />
          </button>
          {logoUrl && (
            <button type="button" className="btn btn-error btn-outline btn-sm" onClick={() => onChange(null)} disabled={uploading}>
              {t("boards.statusPage.logoRemove")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-error text-center text-xs break-words">
          {error}
        </p>
      )}
    </fieldset>
  );
}
