export type ServiceSlug = string;

export type ServiceDefinition = {
  slug: ServiceSlug;
  name: string;
  host: string;
};

export type CatalogCategory =
  | "infrastructure"
  | "devtools"
  | "database"
  | "communication"
  | "ai"
  | "payments"
  | "auth"
  | "projectManagement"
  | "other";

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

// Same as StatuspageIncident/TrackedIncident but without incident_updates —
// what the polled list endpoints (/api/incidents, /api/maintenance) return,
// since only whichever one item is currently selected ever needs its full
// timeline (fetched separately, see app/api/incidents/[slug]/[id]).
export type StatuspageIncidentSummary = Omit<StatuspageIncident, "incident_updates">;
export type TrackedIncidentSummary = StatuspageIncidentSummary & { service: ServiceDefinition };

export type ScheduledMaintenance = StatuspageIncident & {
  scheduled_for: string;
  scheduled_until: string;
};

export type TrackedMaintenance = ScheduledMaintenance & { service: ServiceDefinition };

export type ScheduledMaintenanceSummary = Omit<ScheduledMaintenance, "incident_updates">;
export type TrackedMaintenanceSummary = ScheduledMaintenanceSummary & { service: ServiceDefinition };

export type ServiceStatusEntry =
  | { status: { indicator: Indicator; description: string }; outages24h?: number }
  | { error: string };

export type ServiceStatusBatchResponse = Partial<Record<ServiceSlug, ServiceStatusEntry>>;

