// A recipient of the email/sms integrations — verified = false until the
// confirmation link (email) or texted code (sms) is confirmed; the
// notifier never sends to an unverified recipient.
export type Recipient = { value: string; verified: boolean };

export type Integration = {
  id: string;
  slug: string;
  name: string;
  // Which of this account's own tracked services should NOT trigger this
  // integration; null/empty = notify about all of them, including any
  // tracked later. An exclusion list, not an inclusion one — see the
  // migration comment on the backing column for why.
  excludedServiceSlugs: string[] | null;
};

export type SlackIntegration = Integration & { slug: "slack"; webhookUrl: string };
export type EmailIntegration = Integration & { slug: "email"; recipients: Recipient[] };
export type SmsIntegration = Integration & { slug: "sms"; recipients: Recipient[]; notifyImpacts: string[] };

export type IntegrationDefinition = SlackIntegration | EmailIntegration | SmsIntegration;
