"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ReactNode } from "react";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";
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

// The one popover shell shared by both the "Connect" trigger
// (disconnected) and the "Connected" badge trigger (connected, editable)
// — identical <details>/positioning either way, just a different-looking
// trigger and, while disconnected vs. connected, different content.
function ConnectPopover({
  trigger,
  content,
}: {
  trigger: ReactNode;
  content: (close: () => void) => ReactNode;
}) {
  const formRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useCloseDetailsOnOutsideClick(formRef, () => setOpen(false));

  return (
    <details ref={formRef} open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="dropdown dropdown-end shrink-0">
      <summary className="list-none">{trigger}</summary>
      <div className="dropdown-content menu bg-base-100 border-base-300 z-30 mt-2 w-64 border p-3 shadow-xl">{content(() => setOpen(false))}</div>
    </details>
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
  // Custom popover content — the caller owns its own <form> markup,
  // mutation, and error state; ConnectPopover above only owns the shell
  // (open state, positioning) and hands back `close` so the caller can
  // dismiss it after a successful submit. Reachable via "Connect" while
  // disconnected, and by clicking the "Connected" badge once connected —
  // same slot either way, so an integration with a connectForm (email,
  // sms) is editable after connecting, not just connect-once/disconnect
  // like Slack's OAuth flow.
  connectForm?: (close: () => void) => ReactNode;
  removable?: { isRemoving: boolean; onRemove: () => void };
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(menuRef);

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
          connectForm ? (
            <ConnectPopover
              trigger={
                <span className="badge badge-soft badge-success shrink-0 cursor-pointer text-[10px]">{t("integrations.connected")}</span>
              }
              content={connectForm}
            />
          ) : (
            <span className="badge badge-soft badge-success shrink-0 text-[10px]">{t("integrations.connected")}</span>
          )
        ) : connectHref ? (
          <a href={connectHref} className="btn btn-outline btn-info btn-xs shrink-0">
            {t("integrations.connect")}
          </a>
        ) : (
          connectForm && (
            <ConnectPopover
              trigger={<span className="btn btn-outline btn-info btn-xs">{t("integrations.connect")}</span>}
              content={connectForm}
            />
          )
        )}
      </div>
    </div>
  );
}
