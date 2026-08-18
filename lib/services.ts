import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ServiceDefinition } from "@/types/service";


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

export function removeService(slug: string): boolean {
  const services = getAllServices();
  const next = services.filter((service) => service.slug !== slug);
  if (next.length === services.length) return false;

  writeFileSync(DATA_FILE, JSON.stringify(next, null, 2));
  return true;
}
