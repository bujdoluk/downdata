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
  | "other";

export type Catalog = {
  slug: string;
  name: string;
  host: string;
  category: Category;
};

export type Indicator = "none" | "minor" | "major" | "critical" | string;

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

// Same as Incident/TrackedIncident but without incident_updates —
// what the polled list endpoints (/api/incidents, /api/maintenance) return,
// since only whichever one item is currently selected ever needs its full
// timeline (fetched separately, see app/api/incidents/[slug]/[id]).
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
  | { status: { indicator: Indicator; description: string }; outages24h?: number }
  | { error: string };

export type ServiceStatusBatchResponse = Partial<Record<Slug, ServiceStatusEntry>>;

