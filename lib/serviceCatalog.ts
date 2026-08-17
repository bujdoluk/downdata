import type { CatalogEntry } from "@/types/service";

export const SERVICE_CATALOG: CatalogEntry[] = [
  { slug: "github", name: "GitHub", host: "www.githubstatus.com" },
  { slug: "supabase", name: "Supabase", host: "status.supabase.com" },
  { slug: "cloudflare", name: "Cloudflare", host: "www.cloudflarestatus.com" },
  { slug: "vercel", name: "Vercel", host: "www.vercel-status.com" },
  { slug: "discord", name: "Discord", host: "discordstatus.com" },
  { slug: "npm", name: "npm", host: "status.npmjs.org" },
  { slug: "digitalocean", name: "DigitalOcean", host: "status.digitalocean.com" },
  { slug: "netlify", name: "Netlify", host: "www.netlifystatus.com" },
  { slug: "openai", name: "OpenAI", host: "status.openai.com" },
  { slug: "zoom", name: "Zoom", host: "www.zoomstatus.com" },
  { slug: "dropbox", name: "Dropbox", host: "status.dropbox.com" },
  { slug: "atlassian", name: "Atlassian", host: "status.atlassian.com" },
  { slug: "twilio", name: "Twilio", host: "status.twilio.com" },
  { slug: "mongodb", name: "MongoDB", host: "status.mongodb.com" },
  { slug: "datadog", name: "Datadog", host: "status.datadoghq.com" },
  { slug: "circleci", name: "CircleCI", host: "status.circleci.com" },
];
