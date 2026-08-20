import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { IntegrationDefinition } from "@/types/integration";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "integrations.json");

function ensureDataFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

export function getAllIntegrations(): IntegrationDefinition[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as IntegrationDefinition[];
}

export function addIntegration(input: { slug: string; name: string; webhookUrl: string }): IntegrationDefinition {
  const integrations = getAllIntegrations().filter((integration) => integration.slug !== input.slug);
  const integration: IntegrationDefinition = { slug: input.slug, name: input.name, webhookUrl: input.webhookUrl };
  integrations.push(integration);
  writeFileSync(DATA_FILE, JSON.stringify(integrations, null, 2));
  return integration;
}

export function removeIntegration(slug: string): boolean {
  const integrations = getAllIntegrations();
  const next = integrations.filter((integration) => integration.slug !== slug);
  if (next.length === integrations.length) return false;

  writeFileSync(DATA_FILE, JSON.stringify(next, null, 2));
  return true;
}
