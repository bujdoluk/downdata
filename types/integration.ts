export type Integration = {
  slug: string;
  name: string;
};

export type IntegrationDefinition = Integration & {
  webhookUrl: string;
};
