import type { CatalogEntry } from "@/types/service";

export const SERVICE_CATALOG: CatalogEntry[] = [
  { slug: "github", name: "GitHub", host: "www.githubstatus.com", category: "devtools" },
  { slug: "supabase", name: "Supabase", host: "status.supabase.com", category: "database" },
  { slug: "cloudflare", name: "Cloudflare", host: "www.cloudflarestatus.com", category: "infrastructure" },
  { slug: "vercel", name: "Vercel", host: "www.vercel-status.com", category: "infrastructure" },
  { slug: "discord", name: "Discord", host: "discordstatus.com", category: "communication" },
  { slug: "npm", name: "npm", host: "status.npmjs.org", category: "devtools" },
  { slug: "digitalocean", name: "DigitalOcean", host: "status.digitalocean.com", category: "infrastructure" },
  { slug: "netlify", name: "Netlify", host: "www.netlifystatus.com", category: "infrastructure" },
  { slug: "openai", name: "OpenAI", host: "status.openai.com", category: "ai" },
  { slug: "zoom", name: "Zoom", host: "www.zoomstatus.com", category: "communication" },
  { slug: "dropbox", name: "Dropbox", host: "status.dropbox.com", category: "communication" },
  { slug: "atlassian", name: "Atlassian", host: "status.atlassian.com", category: "devtools" },
  { slug: "twilio", name: "Twilio", host: "status.twilio.com", category: "communication" },
  { slug: "mongodb", name: "MongoDB", host: "status.mongodb.com", category: "database" },
  { slug: "datadog", name: "Datadog", host: "status.datadoghq.com", category: "devtools" },
  { slug: "circleci", name: "CircleCI", host: "status.circleci.com", category: "devtools" },
];
