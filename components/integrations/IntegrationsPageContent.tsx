"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Integration, IntegrationDefinition } from "@/types/integration";
import IntegrationCard from "@/components/integrations/IntegrationCard";
import SlackLogo from "@/components/integrations/SlackLogo";
import EmailLogo from "@/components/integrations/EmailLogo";

const INTEGRATION_LOGOS: Record<string, React.ComponentType<{ size?: number }>> = {
  slack: SlackLogo,
  email: EmailLogo,
};

// Slug -> its OAuth-style connect entry point. Only Slack works this way
// today; a catalog entry with no href here instead gets an inline
// connectForm (see CONNECT_FORM_PLACEHOLDER_KEYS below).
const CONNECT_HREFS: Record<string, string> = {
  slack: "/api/integrations/slack/start",
};

// Slug -> its inline connectForm's input placeholder i18n key. Only email
// works this way today — an integration with no OAuth flow, connected by
// submitting a value (recipient addresses) directly to its own POST route.
const CONNECT_FORM_PLACEHOLDER_KEYS: Record<string, string> = {
  email: "integrations.emailPlaceholder",
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

  function handleConnectEmail(value: string) {
    const recipientEmails = value
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
    connectEmailMutation.mutate(recipientEmails);
  }

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
          const formPlaceholderKey = CONNECT_FORM_PLACEHOLDER_KEYS[entry.slug];
          return (
            <IntegrationCard
              key={entry.slug}
              name={entry.name}
              logo={Logo ? <Logo size={28} /> : null}
              connected={!!integration}
              connectHref={CONNECT_HREFS[entry.slug]}
              connectForm={
                formPlaceholderKey
                  ? {
                      placeholder: t(formPlaceholderKey),
                      isSubmitting: connectEmailMutation.isPending,
                      error: connectEmailMutation.error?.message ?? null,
                      onSubmit: handleConnectEmail,
                    }
                  : undefined
              }
              removable={integration ? { isRemoving: removingSlug === entry.slug, onRemove: () => handleDisconnect(entry) } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
