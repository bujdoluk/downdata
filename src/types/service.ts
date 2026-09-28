export type Slug = string;

export type Service = {
  slug: Slug;
  name: string;
  host: string;
};

export type Category =
  | "infrastructure"
  | "devtools"
  | "database"
  | "communication"
  | "ai"
  | "payments"
  | "auth"
  | "projectManagement"
  | "accounting"
  | "analytics"
  | "automation"
  | "cryptocurrencies"
  | "cybersecurity"
  | "design"
  | "education"
  | "healthcare"
  | "hr"
  | "legal"
  | "logistics"
  | "marketing"
  | "realEstate"
  | "sales"
  | "socialMedia"
  | "other";

export type Catalog = {
  slug: string;
  name: string;
  host: string;
  category: Category;
  componentNamePrefix?: string;
};

export type Indicator = "none" | "minor" | "major" | "critical" | string;

export type OpenIncidentImpact = {
  impact: Indicator;
  name: string;
  shortlink: string;
};

export type Status =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance"
  | string;

export type StatuspageComponent = {
  id: string;
  name: string;
  status: Status;
  position: number;
  // Optional: incident.io omits it entirely, so check `!c.group_id`, not `=== null`.
  group_id?: string | null;
  showcase: boolean;
  group?: boolean;
};

export type IncidentUpdate = {
  id: string;
  status: string;
  body: string;
  created_at: string;
};

export type IncidentComponent = {
  id: string;
  name: string;
  status: string;
};

export type Incident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
  shortlink: string;
  incident_updates: IncidentUpdate[];
  components?: IncidentComponent[];
};

export type ServiceSummaryResponse = {
  service: Service;
  page: {
    updated_at: string;
  };
  status: {
    indicator: Indicator;
    description: string;
  };
  openIncidentImpact?: OpenIncidentImpact;
  components: StatuspageComponent[];
  incidents: Incident[];
  maintenances: ScheduledMaintenanceSummary[];
  last30DaysIncidents: StatuspageIncidentSummary[];
  official30daysUptime: number;
  uptimeWindowDays: number;
  officialAllTimeUptime: number | null;
  trackedSince: string | null;
};

export type TrackedIncident = Incident & { service: Service };

// Polled list endpoints skip updates; only the selected item fetches its timeline.
export type StatuspageIncidentSummary = Omit<Incident, "incident_updates">;
export type TrackedIncidentSummary = StatuspageIncidentSummary & { service: Service };

export type ScheduledMaintenance = Incident & {
  scheduled_for: string;
  scheduled_until: string;
};

export type TrackedMaintenance = ScheduledMaintenance & { service: Service };

export type ScheduledMaintenanceSummary = Omit<ScheduledMaintenance, "incident_updates">;
export type TrackedMaintenanceSummary = ScheduledMaintenanceSummary & { service: Service };

export type ServiceStatusEntry =
  | { status: { indicator: Indicator; description: string }; outages24h?: number; openIncidentImpact?: OpenIncidentImpact }
  | { error: string };

export type ServiceStatusBatchResponse = Partial<Record<Slug, ServiceStatusEntry>>;

