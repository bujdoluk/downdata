// One-shot poll+notify trigger, for whichever scheduler ends up calling it
// (OS cron/Task Scheduler, pm2, ...) since nothing in this repo schedules
// anything on its own. Run via `npm run poll:incidents`.
//
// Just calls the running app's own cron endpoint over HTTP rather than
// importing lib/pollIncidents.ts directly — plain Node can't import
// TypeScript with @/ path aliases without a build step, and this way the
// script and any other trigger (Vercel Cron, an external ping service)
// share the exact same code path instead of two separate invocations that
// could drift apart.

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET is not set — see .env.example.");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/cron/poll-incidents`, {
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.json();
console.log(JSON.stringify(body));

if (!res.ok) process.exit(1);
