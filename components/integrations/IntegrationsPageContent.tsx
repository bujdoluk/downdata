"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { IntegrationDefinition } from "@/types/integration";
import IntegrationCard from "@/components/integrations/IntegrationCard";
import SlackLogo from "@/components/integrations/SlackLogo";
import EmailLogo from "@/components/integrations/EmailLogo";
import SmsLogo from "@/components/integrations/SmsLogo";
import EmailConnectForm from "@/components/integrations/EmailConnectForm";
import SmsConnectForm from "@/components/integrations/SmsConnectForm";

const INTEGRATION_LOGOS: Record<string, React.ComponentType<{ size?: number }>> = {
  slack: SlackLogo,
  email: EmailLogo,
  sms: SmsLogo,
};

// Each catalog entry owns its own OAuth-style connect route today (only
// Slack exists); this maps slug -> that entry point. A slug with no entry
// here instead gets an inline connectForm popover (see below) — email and
// sms, neither of which has an OAuth flow to redirect through.
const CONNECT_HREFS: Record<string, string> = {
  slack: "/api/integrations/slack/start",
};

async function postJson(url: string, body: unknown, fallbackError: string): Promise<void> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  }
}

export default function IntegrationsPageContent({
  catalog,
  integrations,
}: {
  catalog: { slug: string; name: string }[];
  integrations: IntegrationDefinition[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const hasError = searchParams.get("error") !== null;
  const verified = searchParams.get("verified");

  useEffect(() => {
    if (hasError || verified !== null) router.replace("/integrations");
  }, [hasError, verified, router]);

  const disconnectMutation = useMutation({
    mutationFn: (slug: string) => fetch(`/api/integrations/${slug}`, { method: "DELETE" }),
    onSettled: () => setRemovingSlug(null),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });

  function handleDisconnect(slug: string) {
    setRemovingSlug(slug);
    disconnectMutation.mutate(slug);
  }

  const addEmailRecipientMutation = useMutation({
    mutationFn: (value: string) => postJson("/api/integrations/email", { value }, t("integrations.somethingWrong")),
    onSuccess: () => router.refresh(),
  });
  const removeEmailRecipientMutation = useMutation({
    mutationFn: (value: string) => fetch(`/api/integrations/email/recipients/${encodeURIComponent(value)}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });

  const addSmsRecipientMutation = useMutation({
    mutationFn: (value: string) => postJson("/api/integrations/sms", { value }, t("integrations.somethingWrong")),
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

  // Slug -> its inline popover content. IntegrationCard owns the popover
  // shell (open state, positioning); each form here owns its own fields
  // and mutations. Unlike the old bulk-recipient forms, adding/removing/
  // verifying a recipient deliberately never closes the popover — there's
  // usually more than one thing to do in a row (add, then verify), so
  // only an outside click closes it now.
  const connectForms: Record<string, (close: () => void) => ReactNode> = {
    email: () => {
      const current = integrations.find((entry): entry is Extract<IntegrationDefinition, { slug: "email" }> => entry.slug === "email");
      return (
        <EmailConnectForm
          recipients={current?.recipients ?? []}
          isSubmitting={addEmailRecipientMutation.isPending}
          error={addEmailRecipientMutation.error?.message ?? null}
          onAdd={(value) => addEmailRecipientMutation.mutate(value)}
          onRemove={(value) => removeEmailRecipientMutation.mutate(value)}
        />
      );
    },
    sms: () => {
      const current = integrations.find((entry): entry is Extract<IntegrationDefinition, { slug: "sms" }> => entry.slug === "sms");
      return (
        <SmsConnectForm
          recipients={current?.recipients ?? []}
          notifyImpacts={current?.notifyImpacts ?? ["major", "critical"]}
          isSubmitting={addSmsRecipientMutation.isPending}
          isVerifying={verifySmsMutation.isPending}
          error={addSmsRecipientMutation.error?.message ?? null}
          verifyError={verifySmsMutation.error?.message ?? null}
          onAdd={(value) => addSmsRecipientMutation.mutate(value)}
          onRemove={(value) => removeSmsRecipientMutation.mutate(value)}
          onVerify={(value, code) => verifySmsMutation.mutate({ value, code })}
          onResend={(value) => addSmsRecipientMutation.mutate(value)}
          onUpdateImpacts={(impacts) => updateSmsImpactsMutation.mutate(impacts)}
        />
      );
    },
  };

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("integrations.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("integrations.subtitle")}</p>

      {hasError && <p className="alert alert-error alert-soft mt-4 text-sm">{t("integrations.somethingWrong")}</p>}
      {verified === "1" && <p className="alert alert-success alert-soft mt-4 text-sm">{t("integrations.recipientVerified")}</p>}
      {verified === "0" && <p className="alert alert-error alert-soft mt-4 text-sm">{t("integrations.verifyLinkInvalid")}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((entry) => {
          const integration = integrations.find((i) => i.slug === entry.slug);
          const Logo = INTEGRATION_LOGOS[entry.slug];
          return (
            <IntegrationCard
              key={entry.slug}
              name={entry.name}
              logo={Logo ? <Logo size={28} /> : null}
              connected={!!integration}
              connectHref={CONNECT_HREFS[entry.slug]}
              connectForm={connectForms[entry.slug]}
              removable={integration ? { isRemoving: removingSlug === entry.slug, onRemove: () => handleDisconnect(entry.slug) } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
