// The notifier never sends to an unverified recipient.
export type Recipient = { value: string; verified: boolean };

export type Integration = {
  id: string;
  slug: string;
  name: string;
  // Exclusion list so services tracked later notify by default; null/empty = all.
  excludedServiceSlugs: string[] | null;
};

export type SlackIntegration = Integration & { slug: "slack"; webhookUrl: string };
export type EmailIntegration = Integration & { slug: "email"; recipients: Recipient[]; notifyImpacts: string[] };
export type SmsIntegration = Integration & { slug: "sms"; recipients: Recipient[]; notifyImpacts: string[] };

// No verification state, but carries its own HMAC secret.
export type WebhookTarget = { value: string; secret: string };
export type WebhookIntegration = Integration & { slug: "webhook"; targets: WebhookTarget[]; notifyImpacts: string[] };

export type IntegrationDefinition = SlackIntegration | EmailIntegration | SmsIntegration | WebhookIntegration;
