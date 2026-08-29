"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { FormEvent, ReactNode } from "react";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";
import Spinner from "@/components/Spinner";

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export default function IntegrationCard({
  name,
  logo,
  connected,
  connectHref,
  connectForm,
  removable,
}: {
  name: string;
  logo: ReactNode;
  connected: boolean;
  connectHref?: string;
  // For integrations with no OAuth redirect (email today) — an inline
  // popover form instead of connectHref's plain link.
  connectForm?: { placeholder: string; isSubmitting: boolean; error: string | null; onSubmit: (value: string) => void };
  removable?: { isRemoving: boolean; onRemove: () => void };
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(menuRef);
  useCloseDetailsOnOutsideClick(formRef);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("value");
    if (typeof value === "string") connectForm?.onSubmit(value);
  }

  return (
    <div className="card card-border bg-base-200 hover:border-base-content/20 relative flex w-full min-w-0 flex-col shadow-md transition-colors lg:max-w-[370px]">
      {removable && (
        <div className="absolute top-2 right-2 z-10">
          <details ref={menuRef} className="dropdown dropdown-end">
            <summary
              className="btn btn-ghost btn-circle btn-xs list-none transition-transform hover:scale-110 active:scale-90"
              aria-label={t("integrations.options")}
            >
              <DotsIcon />
            </summary>
            <ul className="dropdown-content menu menu-sm bg-base-100 border-base-300 z-30 mt-2 w-40 border shadow-xl">
              <li>
                <button type="button" disabled={removable.isRemoving} onClick={removable.onRemove} className="text-error">
                  {removable.isRemoving ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner size="xs" />
                      {t("integrations.disconnecting")}
                    </span>
                  ) : (
                    t("integrations.disconnect")
                  )}
                </button>
              </li>
            </ul>
          </details>
        </div>
      )}

      <div className={`card-body min-w-0 flex-row items-center gap-3 p-4 ${removable ? "pr-10" : ""}`}>
        {logo}
        <h1 className="card-title min-w-0 flex-1 truncate text-base">{name}</h1>
        {connected ? (
          <span className="badge badge-soft badge-success shrink-0 text-[10px]">{t("integrations.connected")}</span>
        ) : connectHref ? (
          <a href={connectHref} className="btn btn-outline btn-info btn-xs shrink-0">
            {t("integrations.connect")}
          </a>
        ) : (
          connectForm && (
            <details ref={formRef} className="dropdown dropdown-end shrink-0">
              <summary className="btn btn-outline btn-info btn-xs list-none">{t("integrations.connect")}</summary>
              <div className="dropdown-content menu bg-base-100 border-base-300 z-30 mt-2 w-64 border p-3 shadow-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                  <input
                    type="text"
                    name="value"
                    placeholder={connectForm.placeholder}
                    className="input input-sm input-bordered w-full"
                  />
                  {connectForm.error && <p className="text-error text-xs">{connectForm.error}</p>}
                  <button type="submit" disabled={connectForm.isSubmitting} className="btn btn-primary btn-xs">
                    {connectForm.isSubmitting ? <Spinner size="xs" /> : t("integrations.connect")}
                  </button>
                </form>
              </div>
            </details>
          )
        )}
      </div>
    </div>
  );
}
