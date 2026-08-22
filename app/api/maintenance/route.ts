import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import { getAllStoredMaintenances, toMaintenanceApiShape } from "@/lib/getStoredMaintenance";
import type { TrackedMaintenance } from "@/types/service";

export async function GET() {
  const services = await getAllServices();
  const maintenances = await getAllStoredMaintenances(services.map((service) => service.slug));
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));

  const results: TrackedMaintenance[] = maintenances.flatMap((maintenance) => {
    const service = serviceBySlug.get(maintenance.service_slug);
    return service ? [{ ...toMaintenanceApiShape(maintenance), service }] : [];
  });

  return NextResponse.json({ maintenances: results });
}
