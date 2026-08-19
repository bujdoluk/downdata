import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import type { ScheduledMaintenance, TrackedMaintenance } from "@/types/service";

export async function GET() {
  const services = getAllServices();

  const results = await Promise.all(
    services.map(async (service): Promise<TrackedMaintenance[]> => {
      try {
        const res = await fetch(`https://${service.host}/api/v2/scheduled-maintenances/upcoming.json`, {
          next: { revalidate: 30 },
        });
        if (!res.ok) return [];

        const data = await res.json();
        return (data.scheduled_maintenances as ScheduledMaintenance[]).map((maintenance) => ({ ...maintenance, service }));
      } catch {
        return [];
      }
    }),
  );

  const maintenances = results.flat().sort((a, b) => (a.scheduled_for < b.scheduled_for ? -1 : 1));

  return NextResponse.json({ maintenances });
}
