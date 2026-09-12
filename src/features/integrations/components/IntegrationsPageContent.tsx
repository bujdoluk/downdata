"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { IntegrationDefinition } from "@/types/integration";
import IntegrationCard from "@/features/integrations/components/IntegrationCard";
import SlackLogo from "@/features/integrations/components/SlackLogo";
import EmailLogo from "@/features/integrations/components/EmailLogo";
import SmsLogo from "@/features/integrations/components/SmsLogo";
import WebhookLogo from "@/features/integrations/components/WebhookLogo";
import RequestCard from "@/components/RequestCard";
import ModalCloseButton from "@/components/ModalCloseButton";
// Imported directly, not via features/status-pages' barrel — that barrel
// also re-exports its server-only services/statusPages.ts (next/headers,
// createClient), and this file is a Client Component, so pulling it in
// through the barrel drags server-only code into the client bundle.
import EmbedConfigurator from "@/features/status-pages/components/EmbedConfigurator";
import { postJson } from "@/lib/fetchJson";
import { TAB_BG_STYLE } from "@/lib/utils";
// Static, not dynamic() — each was its own lazy chunk, and the very first
// time a given modal opened, showModal() (called synchronously in the
// click handler) ran its native focusing steps before that chunk had
// finished loading, so the autoFocus input didn't exist in the DOM yet and
// focus fell back to the dialog itself. These forms are tiny (no heavy
// deps), so there was no real bundle-size case for splitting them out —
// static import removes the race instead of racing it with a ref/effect.
import EmailConnectForm from "@/features/integrations/components/EmailConnectForm";
import SmsConnectForm from "@/features/integrations/components/SmsConnectForm";
import WebhookConnectForm from "@/features/integrations/components/WebhookConnectForm";

const INTEGRATION_LOGOS: Record<string, React.ComponentType<{ size?: number }>> = {
  slack: SlackLogo,
  email: EmailLogo,
  sms: SmsLogo,
  webhook: WebhookLogo,
};

// Each catalog entry owns its own OAuth-style connect route today (only
// Slack exists); this maps slug -> that entry point. A slug with no entry
// here instead gets its own modal (see the three <dialog>s below) — email,
// sms, and webhook, none of which has an OAuth flow to redirect through.
const CONNECT_HREFS: Record<string, string> = {
  slack: "/api/integrations/slack/start",
};

export default function IntegrationsPageContent({
  catalog,
  integrations,
  embedBoards,
}: {
  catalog: { slug: string; name: string }[];
  integrations: IntegrationDefinition[];
  // Boards with an enabled public status page — the "Embeds" tab's board
  // picker. Fetched here (features/status-pages' own getAllEnabledStatusPages)
  // rather than inside EmbedConfigurator itself, same reasoning every other
  // Server Component page in this app fetches its own data: no client
  // round trip needed for something that's already known at request time.
  embedBoards: { boardId: string; boardName: string; slug: string }[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  // A Set, not a single slug — several integration cards can each have
  // their own disconnect in flight; a single shared value got clobbered by
  // a second disconnect click before the first request settled.
  const [removingSlugs, setRemovingSlugs] = useState<Set<string>>(new Set());
  const hasError = searchParams.get("error") !== null;
  const verified = searchParams.get("verified");
  const emailDialogRef = useRef<HTMLDialogElement>(null);
  const smsDialogRef = useRef<HTMLDialogElement>(null);
  const webhookDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (hasError || verified !== null) router.replace("/integrations");
  }, [hasError, verified, router]);

  const disconnectMutation = useMutation({
    mutationFn: (slug: string) => fetch(`/api/integrations/${slug}`, { method: "DELETE" }),
    // `slug` here is this specific call's own variable — only clear that
    // one integration's pending state, not whichever disconnect happened
    // to be in flight when this one settled.
    onSettled: (_data, _error, slug) =>
      setRemovingSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      }),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });

  function handleDisconnect(slug: string) {
    setRemovingSlugs((prev) => new Set(prev).add(slug));
    disconnectMutation.mutate(slug);
  }

  const addEmailRecipientMutation = useMutation({
    mutationFn: ({ value, notifyImpacts }: { value: string; notifyImpacts: string[] }) =>
      postJson("/api/integrations/email", { value, notifyImpacts }, t("integrations.somethingWrong")),
    onSuccess: () => router.refresh(),
  });
  const removeEmailRecipientMutation = useMutation({
    mutationFn: (value: string) => fetch(`/api/integrations/email/recipients/${encodeURIComponent(value)}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });
  const updateEmailImpactsMutation = useMutation({
    mutationFn: async (notifyImpacts: string[]) => {
      const res = await fetch("/api/integrations/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyImpacts }),
      });
      if (!res.ok) throw new Error(t("integrations.somethingWrong"));
    },
    onSuccess: () => router.refresh(),
  });

  const addSmsRecipientMutation = useMutation({
    mutationFn: ({ value, notifyImpacts }: { value: string; notifyImpacts: string[] }) =>
      postJson("/api/integrations/sms", { value, notifyImpacts }, t("integrations.somethingWrong")),
    onSuccess: () => router.refresh(),
  });
  const removeSmsRecipientMutation = useMutation({
    mutationFn: (value: string) => fetch(`/api/integrations/sms/recipients/${encodeURIComponent(value)}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });
  const verifySmsMutation = useMutation({
    mutationFn: ({ value, code }: { value: string; code: string }) =>
      postJson("/api/integrations/sms/verify", { value, code }, t("integrations.somethingWrong")),
    onSuccess: () => router.refresh(),
  });
  const updateSmsImpactsMutation = useMutation({
    mutationFn: async (notifyImpacts: string[]) => {
      const res = await fetch("/api/integrations/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyImpacts }),
      });
      if (!res.ok) throw new Error(t("integrations.somethingWrong"));
    },
    onSuccess: () => router.refresh(),
  });

  const addWebhookMutation = useMutation({
    mutationFn: ({ value, notifyImpacts }: { value: string; notifyImpacts: string[] }) =>
      postJson("/api/integrations/webhook", { value, notifyImpacts }, t("integrations.somethingWrong")),
    onSuccess: () => router.refresh(),
  });
  const removeWebhookMutation = useMutation({
    mutationFn: (value: string) => fetch(`/api/integrations/webhook/recipients/${encodeURIComponent(value)}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });
  const updateWebhookImpactsMutation = useMutation({
    mutationFn: async (notifyImpacts: string[]) => {
      const res = await fetch("/api/integrations/webhook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyImpacts }),
      });
      if (!res.ok) throw new Error(t("integrations.somethingWrong"));
    },
    onSuccess: () => router.refresh(),
  });

  const currentEmail = integrations.find((entry): entry is Extract<IntegrationDefinition, { slug: "email" }> => entry.slug === "email");
  const currentSms = integrations.find((entry): entry is Extract<IntegrationDefinition, { slug: "sms" }> => entry.slug === "sms");
  const currentWebhook = integrations.find((entry): entry is Extract<IntegrationDefinition, { slug: "webhook" }> => entry.slug === "webhook");

  // slug -> the ref of the <dialog> IntegrationCard's onConnectClick should
  // open — every non-Slack integration works this same way now.
  const dialogRefs: Record<string, React.RefObject<HTMLDialogElement | null>> = {
    email: emailDialogRef,
    sms: smsDialogRef,
    webhook: webhookDialogRef,
  };

  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("integrations.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("integrations.subtitle")}</p>

      {hasError && (
        <p role="alert" className="alert alert-error alert-soft mt-4 text-sm">
          {t("integrations.somethingWrong")}
        </p>
      )}
      {verified === "1" && (
        <p role="status" className="alert alert-success alert-soft mt-4 text-sm">
          {t("integrations.recipientVerified")}
        </p>
      )}
      {verified === "0" && (
        <p role="alert" className="alert alert-error alert-soft mt-4 text-sm">
          {t("integrations.verifyLinkInvalid")}
        </p>
      )}

      {/* Radio-input tabs: selection is pure CSS (:checked + sibling
          selector), same idiom as add-service's own category tabs — both
          panels stay mounted, no React state needed to switch between
          them. */}
      <div role="tablist" className="tabs tabs-lift mt-4">
        <input type="radio" name="integrationsTabs" className="tab" aria-label={t("integrations.embeds.tabIntegrations")} style={TAB_BG_STYLE} defaultChecked />
        <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] gap-4">
            {catalog.map((entry) => {
              const integration = integrations.find((i) => i.slug === entry.slug);
              const Logo = INTEGRATION_LOGOS[entry.slug];
              const dialogRef = dialogRefs[entry.slug];
              return (
                <IntegrationCard
                  key={entry.slug}
                  name={entry.name}
                  logo={Logo ? <Logo size={28} /> : null}
                  connected={!!integration}
                  connectHref={CONNECT_HREFS[entry.slug]}
                  onConnectClick={dialogRef ? () => dialogRef.current?.showModal() : undefined}
                  removable={integration ? { isRemoving: removingSlugs.has(entry.slug), onRemove: () => handleDisconnect(entry.slug) } : undefined}
                />
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <RequestCard title={t("integrations.requestCard.title")} buttonLabel={t("integrations.requestCard.button")} kind="integration" />
          </div>
        </div>

        <input type="radio" name="integrationsTabs" className="tab" aria-label={t("integrations.embeds.tabEmbeds")} style={TAB_BG_STYLE} />
        <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
          <EmbedConfigurator boards={embedBoards} />
        </div>
      </div>

      {/* Every non-Slack integration's connect surface is its own modal —
          Slack has no popover/form at all (a plain OAuth redirect), so a
          modal is the only placement that works uniformly; email/sms/
          webhook all follow the same hand-rolled <dialog> convention
          BoardSelect's/RequestCard's own modals already use. */}
      <dialog ref={emailDialogRef} className="modal">
        <div className="modal-box relative">
          <ModalCloseButton />
          <h3 className="text-lg font-bold">{t("integrations.connectEmail")}</h3>
          <div className="mt-4">
            <EmailConnectForm
              recipients={currentEmail?.recipients ?? []}
              notifyImpacts={currentEmail?.notifyImpacts ?? ["major", "critical"]}
              isSubmitting={addEmailRecipientMutation.isPending}
              error={addEmailRecipientMutation.error?.message ?? null}
              onAdd={(value, notifyImpacts) => addEmailRecipientMutation.mutate({ value, notifyImpacts })}
              onRemove={(value) => removeEmailRecipientMutation.mutate(value)}
              onUpdateImpacts={(impacts) => updateEmailImpactsMutation.mutate(impacts)}
              onCancel={() => emailDialogRef.current?.close()}
            />
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("integrations.cancel")}</button>
        </form>
      </dialog>

      <dialog ref={smsDialogRef} className="modal">
        <div className="modal-box relative">
          <ModalCloseButton />
          <h3 className="text-lg font-bold">{t("integrations.connectSms")}</h3>
          <div className="mt-4">
            <SmsConnectForm
              recipients={currentSms?.recipients ?? []}
              notifyImpacts={currentSms?.notifyImpacts ?? ["major", "critical"]}
              isSubmitting={addSmsRecipientMutation.isPending}
              isVerifying={verifySmsMutation.isPending}
              error={addSmsRecipientMutation.error?.message ?? null}
              verifyError={verifySmsMutation.error?.message ?? null}
              onAdd={(value, notifyImpacts) => addSmsRecipientMutation.mutate({ value, notifyImpacts })}
              onRemove={(value) => removeSmsRecipientMutation.mutate(value)}
              onVerify={(value, code) => verifySmsMutation.mutate({ value, code })}
              onResend={(value, notifyImpacts) => addSmsRecipientMutation.mutate({ value, notifyImpacts })}
              onUpdateImpacts={(impacts) => updateSmsImpactsMutation.mutate(impacts)}
              onCancel={() => smsDialogRef.current?.close()}
            />
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("integrations.cancel")}</button>
        </form>
      </dialog>

      <dialog ref={webhookDialogRef} className="modal">
        <div className="modal-box relative">
          <ModalCloseButton />
          <h3 className="text-lg font-bold">{t("integrations.connectWebhook")}</h3>
          <div className="mt-4">
            <WebhookConnectForm
              targets={currentWebhook?.targets ?? []}
              notifyImpacts={currentWebhook?.notifyImpacts ?? ["major", "critical"]}
              isSubmitting={addWebhookMutation.isPending}
              error={addWebhookMutation.error?.message ?? null}
              onAdd={(value, notifyImpacts) => addWebhookMutation.mutate({ value, notifyImpacts })}
              onRemove={(value) => removeWebhookMutation.mutate(value)}
              onUpdateImpacts={(impacts) => updateWebhookImpactsMutation.mutate(impacts)}
              onCancel={() => webhookDialogRef.current?.close()}
            />
          </div>
        </div>
        {/* Native <dialog> already closes on Escape via showModal() — this
            backdrop form is only for a click outside the box, same pattern
            as BoardSelect's/RequestCard's own modals. */}
        <form method="dialog" className="modal-backdrop">
          <button>{t("integrations.cancel")}</button>
        </form>
      </dialog>
    </div>
  );
}
