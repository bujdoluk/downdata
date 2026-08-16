import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// The service registry, persisted as a JSON file on disk instead of
// hardcoded in source. This is what lets services be added at runtime
// (see app/add-service) without a rebuild/redeploy. It's a plain file
// rather than a real database because this app is meant to be self-hosted
// on a normal VPS (Hetzner) with a persistent disk — no separate DB
// service to run, and it's a trivial swap for SQLite/Postgres later if
// the write-concurrency needs ever outgrow a JSON file.

export type ServiceSlug = string;

export type ServiceDefinition = {
  slug: ServiceSlug;
  name: string;
  host: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "services.json");

const BUILTIN_SERVICES: ServiceDefinition[] = [
  { slug: "github", name: "GitHub", host: "www.githubstatus.com" },
  { slug: "supabase", name: "Supabase", host: "status.supabase.com" },
];

function ensureDataFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(BUILTIN_SERVICES, null, 2));
  }
}

export function getAllServices(): ServiceDefinition[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as ServiceDefinition[];
}

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return getAllServices().find((service) => service.slug === slug);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function addService(input: { name: string; host: string }): ServiceDefinition {
  const services = getAllServices();
  const baseSlug = slugify(input.name) || "service";

  let slug = baseSlug;
  let suffix = 2;
  while (services.some((service) => service.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const service: ServiceDefinition = { slug, name: input.name.trim(), host: input.host.trim() };
  services.push(service);
  writeFileSync(DATA_FILE, JSON.stringify(services, null, 2));
  return service;
}
