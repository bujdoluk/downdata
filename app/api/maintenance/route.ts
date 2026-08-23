import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/lib/getStoredMaintenance";
import type { TrackedMaintenanceSummary } from "@/types/service";

export async function GET() {
  const services = await getAllServices();
  const maintenances = await getAllStoredMaintenanceSummaries(services.map((service) => service.slug));
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));

  const results: TrackedMaintenanceSummary[] = maintenances.flatMap((maintenance) => {
    const service = serviceBySlug.get(maintenance.service_slug);
    return service ? [{ ...toMaintenanceSummaryApiShape(maintenance), service }] : [];
  });

  return NextResponse.json({ maintenances: results });
}
