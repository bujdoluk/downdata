"use client";

import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";

// Shared by every <dialog>-based connect/create form's own <form> (Email/
// Sms/WebhookConnectForm, CreateBoardForm) — was copy-pasted identically
// into the first three (including this same comment explaining why it
// isn't daisyUI's .modal-action). That class is justify-content: flex-end,
// which clusters both buttons on the right; Cancel/Add at opposite edges
// needs an explicit justify-between instead. Moved here from
// features/integrations/ once a second feature (boards) needed it too.
export default function ModalFormFooter({
  onCancel,
  cancelLabel,
  submitLabel,
  isSubmitting,
  submitDisabled = false,
}: {
  onCancel: () => void;
  // Caller-resolved, not a t() call in here: this component has no single
  // feature to key a translation off of, and every caller already has its
  // own "cancel" copy in context (integrations.cancel, boards.cancel) —
  // resolving it here previously meant every caller silently got
  // integrations' wording regardless of its own dialog's actual copy.
  cancelLabel: ReactNode;
  submitLabel: ReactNode;
  isSubmitting: boolean;
  // Additional caller-specific disable condition (e.g. an empty required
  // field) on top of isSubmitting. Optional, defaulting to false, so the
  // three connect forms that never had this keep their existing behavior.
  submitDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button type="button" onClick={onCancel} className="btn btn-sm">
        {cancelLabel}
      </button>
      <button type="submit" disabled={isSubmitting || submitDisabled} className="btn btn-info btn-sm">
        {isSubmitting ? <Spinner size="xs" /> : submitLabel}
      </button>
    </div>
  );
}
