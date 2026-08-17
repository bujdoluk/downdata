export type ServiceSlug = string;

export type ServiceDefinition = {
  slug: ServiceSlug;
  name: string;
  host: string;
};

export type CatalogEntry = {
  slug: string;
  name: string;
  host: string;
};

export type Indicator = "none" | "minor" | "major" | "critical" | string;

export type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance"
  | string;

export type StatuspageComponent = {
  id: string;
  name: string;
  status: ComponentStatus;
  position: number;
  group_id: string | null;
  showcase: boolean;
};

export type StatuspageIncident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  updated_at: string;
  shortlink: string;
};

export type ServiceSummaryResponse = {
  service: ServiceDefinition;
  page: {
    updated_at: string;
  };
  status: {
    indicator: Indicator;
    description: string;
  };
  components: StatuspageComponent[];
  incidents: StatuspageIncident[];
};

export type ServiceStatusEntry =
  | { status: { indicator: Indicator; description: string }; outages24h?: number }
  | { error: string };

export type ServiceStatusBatchResponse = Partial<Record<ServiceSlug, ServiceStatusEntry>>;

export type ServiceCardProps = {
  slug: ServiceSlug;
  name: string;
  indicator?: Indicator;
  description?: string;
  outages24h?: number;
  isLoading: boolean;
  error: boolean;
};
