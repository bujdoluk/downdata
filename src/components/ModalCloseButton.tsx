"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { CloseIcon } from "@/components/icons/NavIcons";

// The "X" close affordance for every <dialog className="modal">'s
// modal-box, top-right corner. A method="dialog" submit button, same idiom
// as every dialog's own invisible modal-backdrop cancel button — submitting
// it just calls the native <dialog>.close(), which already fires whatever
// onClose handling that dialog has (e.g. RequestCard's reset, CookieConsent's
// setPreferencesOpen(false)) the same way Escape/backdrop-click already do.
// No props, no onClose wiring needed. Caller must add `relative` to its own
// modal-box className — daisyUI's .modal-box has no position of its own, and
// the <dialog> itself gets position: fixed from the browser's UA styles once
// open, so this button's `absolute` would otherwise anchor to the viewport
// corner instead of the card corner.
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
