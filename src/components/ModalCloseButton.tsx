"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { CloseIcon } from "@/components/icons/NavIcons";

// method="dialog" close fires the dialog's own onClose like Escape does. Caller's modal-box
// must be `relative`, or this anchors to the viewport corner.
export default function ModalCloseButton() {
  const { t } = useTranslation();

  return (
    <form method="dialog">
      <button
        type="submit"
        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        aria-label={t("common.close")}
      >
        <CloseIcon />
      </button>
    </form>
  );
}
