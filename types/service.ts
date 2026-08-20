export type ServiceSlug = string;

export type ServiceDefinition = {
  slug: ServiceSlug;
  name: string;
  host: string;
};

export type CatalogCategory = "infrastructure" | "devtools" | "database" | "communication" | "ai";

export type CatalogEntry = {
  slug: string;
  name: string;
  host: string;
  category: CatalogCategory;
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
  group: boolean;
};

export type IncidentUpdate = {
  id: string;
  status: string;
  body: string;
  created_at: string;
};

export type StatuspageIncident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
  shortlink: string;
  incident_updates: IncidentUpdate[];
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

export type TrackedIncident = StatuspageIncident & { service: ServiceDefinition };

export type ScheduledMaintenance = StatuspageIncident & {
  scheduled_for: string;
  scheduled_until: string;
};

export type TrackedMaintenance = ScheduledMaintenance & { service: ServiceDefinition };

export type ServiceStatusEntry =
  | { status: { indicator: Indicator; description: string }; outages24h?: number }
  | { error: string };

export type ServiceStatusBatchResponse = Partial<Record<ServiceSlug, ServiceStatusEntry>>;

