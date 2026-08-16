import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";

// Batched status endpoint: one request fans out to every registered
// service's upstream in parallel, server-side, instead of each client
// component polling its own /api/status/:slug independently. Each
// individual upstream fetch is still cached per-URL for 30s (see
// `next.revalidate` below), so this doesn't change how often we hit
// upstream — it only collapses N client requests into 1.
export async function GET() {
  const entries = await Promise.all(
    getAllServices().map(async (service) => {
      try {
        const res = await fetch(`https://${service.host}/api/v2/status.json`, {
          next: { revalidate: 30 },
        });

        if (!res.ok) {
          return [service.slug, { error: `Upstream returned ${res.status}` }] as const;
        }

        const data = await res.json();
        return [service.slug, { status: data.status }] as const;
      } catch {
        return [service.slug, { error: "Failed to reach status API" }] as const;
      }
    }),
  );

  return NextResponse.json(Object.fromEntries(entries));
}
