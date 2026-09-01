"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Spinner from "@/components/Spinner";

const MAX_MESSAGE_LENGTH = 500;

// A small "can't find what you're looking for?" prompt — used on the
// integrations page, the add-service catalog browser, and the landing
// page. Owns its own modal: clicking buttonLabel opens a dialog with a
// free-text box, POSTed to /api/requests (public — see proxy.ts). Copy
// (title/buttonLabel) stays caller-owned; only kind decides the payload.
export default function RequestCard({
  title,
  buttonLabel,
  kind,
  className = "",
}: {
  title: string;
  buttonLabel: string;
  kind: "service" | "integration";
  className?: string;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : t("requestModal.somethingWrong"));
      }
    },
  });

  function reset() {
    setMessage("");
    mutation.reset();
  }

  return (
    <div
      className={`border-base-content/20 flex aspect-square w-44 flex-none flex-col items-center justify-center gap-3 rounded-box border border-dashed p-4 text-center ${className}`}
    >
      <p className="text-base-content/60 text-sm">{title}</p>
      <button type="button" className="btn btn-outline btn-info btn-sm" onClick={() => dialogRef.current?.showModal()}>
        {buttonLabel}
      </button>

      <dialog ref={dialogRef} className="modal" onClose={reset}>
        <div className="modal-box">
          <h3 className="text-lg font-bold">{title}</h3>
          {mutation.isSuccess ? (
            <p className="text-success mt-4 text-sm">{t("requestModal.sent")}</p>
          ) : (
            <div className="mt-4">
              <textarea
                className="textarea textarea-bordered w-full"
                rows={4}
                maxLength={MAX_MESSAGE_LENGTH}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("requestModal.placeholder")}
              />
              <div className="text-base-content/50 mt-1 text-right text-xs">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </div>
              {mutation.error && <p className="text-error mt-2 text-sm">{mutation.error.message}</p>}
            </div>
          )}

          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                {mutation.isSuccess ? t("requestModal.close") : t("account.cancel")}
              </button>
              {!mutation.isSuccess && (
                <button
                  type="button"
                  disabled={!message.trim() || mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="btn btn-info btn-sm"
                >
                  {mutation.isPending ? <Spinner size="xs" /> : t("requestModal.submit")}
                </button>
              )}
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("account.cancel")}</button>
        </form>
      </dialog>
    </div>
  );
}
