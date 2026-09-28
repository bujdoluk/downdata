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

// Unlike AvatarUpload, doesn't persist logoUrl: it's part of the settings form's single save.

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

  // <user_id> first: storage RLS compares the first path segment to auth.uid() (0026).
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
      {/* Invisible, not removed: reserves legend height so this row aligns with the slug input. */}
      <legend className="fieldset-legend invisible" aria-hidden="true">
        {" "}
      </legend>
      <div className="flex items-center justify-center gap-3">
        {logoUrl ? (
          <div className="avatar">
            <div className="bg-base-100 w-12 rounded-full border">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, not an allowlistable domain */}
              <img src={logoUrl} alt="" />
            </div>
          </div>
        ) : hideBranding ? (
          // Empty circle: with branding hidden and no logo, the public page shows no mark at all.
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
          {/* A button so the tooltip is keyboard-focusable; aria-label since data-tip isn't read aloud. */}
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
