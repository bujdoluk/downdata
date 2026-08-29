export type Integration = {
  slug: string;
  name: string;
};

export type SlackIntegration = Integration & { slug: "slack"; webhookUrl: string };
export type EmailIntegration = Integration & { slug: "email"; recipientEmails: string[] };

export type IntegrationDefinition = SlackIntegration | EmailIntegration;
