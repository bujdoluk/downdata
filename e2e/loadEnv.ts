import { readFileSync } from "node:fs";

// Specs load this themselves because Playwright's test-runner process never inherits webServer.env.
export function loadTestEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.test.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    // Both capture groups are non-optional, so a match guarantees them.
    if (match) env[match[1]!] = match[2]!;
  }
  return env;
}
