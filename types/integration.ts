export type IntegrationCatalogEntry = {
  slug: string;
  name: string;
};

export type IntegrationDefinition = IntegrationCatalogEntry & {
  webhookUrl: string;
};
