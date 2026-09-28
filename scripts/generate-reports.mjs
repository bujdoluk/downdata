// Calls the cron endpoint over HTTP for the same reason as poll-incidents.mjs.
// Must be scheduled hourly, not daily (see REPORT_SEND_HOUR in reportGeneration.ts).

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
