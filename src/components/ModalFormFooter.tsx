"use client";

import type { ReactNode } from "react";
import Spinner from "@/components/Spinner";

// Not daisyUI's .modal-action: its flex-end clusters both buttons on the right.
export default function ModalFormFooter({
  onCancel,
  cancelLabel,
  submitLabel,
  isSubmitting,
  submitDisabled = false,
}: {
  onCancel: () => void;
  // Caller-resolved: each feature has its own "cancel" copy.
  cancelLabel: ReactNode;
  submitLabel: ReactNode;
  isSubmitting: boolean;
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
