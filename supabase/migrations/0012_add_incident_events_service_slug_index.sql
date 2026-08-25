-- incident_events had no index on service_slug despite being filtered by
-- it in two hot paths: notifyPendingEvents (every ~60s poll cycle, scoped
-- to tracked slugs) and backfillIfFirstPoll (once per service's first-ever
-- poll). Catalog-wide polling means this table spans every catalog
-- service, not just tracked ones, so both queries were seq-scanning the
-- whole table — the likely source of the unusual Disk IO usage, worse
-- right after a catalog-growth deploy (0009/0011) since every newly added
-- service's first poll does one of these scans, and FETCH_CONCURRENCY=200
-- in pollAllIncidents means a batch of them can land concurrently.
create index incident_events_service_slug_idx on incident_events (service_slug);
