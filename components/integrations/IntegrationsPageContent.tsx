"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Integration, IntegrationDefinition } from "@/types/integration";
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

export default function IntegrationsPageContent({
  catalog,
  integrations,
}: {
  catalog: Integration[];
  integrations: IntegrationDefinition[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const hasError = searchParams.get("error") !== null;

  useEffect(() => {
    if (hasError) router.replace("/integrations");
  }, [hasError, router]);

  const disconnectMutation = useMutation({
    mutationFn: (entry: Integration) => fetch(`/api/integrations/${entry.slug}`, { method: "DELETE" }),
    onSettled: () => setRemovingSlug(null),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });

  function handleDisconnect(entry: Integration) {
    setRemovingSlug(entry.slug);
    disconnectMutation.mutate(entry);
  }

  const connectEmailMutation = useMutation({
    mutationFn: async (recipientEmails: string[]) => {
      const res = await fetch("/api/integrations/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmails }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : t("integrations.somethingWrong"));
      }
    },
    onSuccess: () => router.refresh(),
  });

  const connectSmsMutation = useMutation({
    mutationFn: async ({ recipientPhones, notifyImpacts }: { recipientPhones: string[]; notifyImpacts: string[] }) => {
      const res = await fetch("/api/integrations/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientPhones, notifyImpacts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : t("integrations.somethingWrong"));
      }
    },
    onSuccess: () => router.refresh(),
  });

  // Slug -> its inline popover content. IntegrationCard owns the popover
  // shell (open state, positioning) and hands back `close`; each form
  // here owns its own fields, mutation, and error state, and calls
  // `close` on success so editing an already-connected integration
  // dismisses the popover the same way a fresh connect does.
  const connectForms: Record<string, (close: () => void) => ReactNode> = {
    email: (close) => {
      const current = integrations.find((i): i is Extract<IntegrationDefinition, { slug: "email" }> => i.slug === "email");
      return (
        <EmailConnectForm
          currentEmails={current?.recipientEmails}
          isSubmitting={connectEmailMutation.isPending}
          error={connectEmailMutation.error?.message ?? null}
          onSubmit={(recipientEmails) => connectEmailMutation.mutate(recipientEmails, { onSuccess: close })}
        />
      );
    },
    sms: (close) => {
      const current = integrations.find((i): i is Extract<IntegrationDefinition, { slug: "sms" }> => i.slug === "sms");
      return (
        <SmsConnectForm
          current={current}
          isSubmitting={connectSmsMutation.isPending}
          error={connectSmsMutation.error?.message ?? null}
          onSubmit={(recipientPhones, notifyImpacts) => connectSmsMutation.mutate({ recipientPhones, notifyImpacts }, { onSuccess: close })}
        />
      );
    },
  };

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("integrations.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("integrations.subtitle")}</p>

      {hasError && (
        <p className="alert alert-error alert-soft mt-4 text-sm">{t("integrations.somethingWrong")}</p>
      )}

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
              removable={integration ? { isRemoving: removingSlug === entry.slug, onRemove: () => handleDisconnect(entry) } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
