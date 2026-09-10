// One-shot generate trigger for account reports, mirroring
// scripts/poll-incidents.mjs exactly (see its own comment for why this
// calls the running app's own cron endpoint over HTTP rather than
// importing lib/reportGeneration.ts directly). Run via
// `npm run generate:reports`.
//
// This one needs to actually be scheduled roughly hourly by whatever
// external scheduler calls it (cron-job.org, etc.) — see
// features/reports/services/reportGeneration.ts's REPORT_SEND_HOUR
// comment for why a daily trigger isn't enough.

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET is not set — see .env.example.");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/cron/generate-reports`, {
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.json();
console.log(JSON.stringify(body));

if (!res.ok) process.exit(1);
