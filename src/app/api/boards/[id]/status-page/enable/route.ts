import { NextResponse } from "next/server";
import { resolveBoardById } from "@/features/boards/services/boards";
import { getStatusPage, setEnabled, countEnabledStatusPages } from "@/features/status-pages/services/statusPages";
import { getSubscription } from "@/features/billing/services/subscriptions";
import { statusPageQuota } from "@/features/billing/services/plans";

// Separate from PUT .../status-page so the quota check runs only at publish time.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const existing = await getStatusPage(id);
  if (!existing) {
    return NextResponse.json({ error: "Set up a status page before making it public." }, { status: 400 });
  }
  // Idempotent: an already-live page doesn't count against the quota twice.
  if (existing.enabled) {
    return NextResponse.json(existing);
  }

  const subscription = await getSubscription();
  const quota = statusPageQuota(subscription?.plan ?? null);
  const currentlyEnabled = await countEnabledStatusPages();
  if (currentlyEnabled >= quota) {
    return NextResponse.json(
      { error: "You've reached your plan's status page limit. Upgrade to publish more." },
      { status: 403 },
    );
  }

  return NextResponse.json(await setEnabled(id, true));
}

// Keeps the row so re-publishing doesn't mean reconfiguring from scratch.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const updated = await setEnabled(id, false);
  if (!updated) {
    return NextResponse.json({ error: "Status page not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
