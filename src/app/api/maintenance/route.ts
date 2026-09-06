import { NextResponse } from "next/server";
import { getAllTrackedSlugs } from "@/features/boards/services/boards";
import { getCatalog, buildTrackedServiceLookup } from "@/lib/catalog";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/features/maintenance/services/getStoredMaintenance";
import type { TrackedMaintenanceSummary } from "@/types/service";

export async function GET() {
  const [trackedSlugs, catalog] = await Promise.all([getAllTrackedSlugs(), getCatalog()]);
  const maintenances = await getAllStoredMaintenanceSummaries(trackedSlugs);
  const serviceBySlug = buildTrackedServiceLookup(trackedSlugs, catalog);

  const results: TrackedMaintenanceSummary[] = maintenances.flatMap((maintenance) => {
    const service = serviceBySlug.get(maintenance.service_slug);
    return service ? [{ ...toMaintenanceSummaryApiShape(maintenance), service }] : [];
  });

  return NextResponse.json({ maintenances: results });
}
