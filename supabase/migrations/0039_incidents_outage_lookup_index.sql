create index incidents_outage_impact_created_idx
  on incidents (impact, created_at desc)
  include (service_slug);
