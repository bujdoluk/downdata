import { NextResponse } from "next/server";
import { resolveBoardById } from "@/lib/boards";
import { getStatusPage, setEnabled, countEnabledStatusPages } from "@/lib/statusPages";
import { getSubscription } from "@/lib/subscriptions";
import { statusPageQuota } from "@/lib/plans";

// Publishes the board's status page — kept separate from PUT
// .../status-page so the quota check only ever runs here, at the moment a
// page actually goes live, not on every branding save.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const existing = await getStatusPage(id);
  if (!existing) {
    return NextResponse.json({ error: "Set up a status page before making it public." }, { status: 400 });
  }
  // Already live: idempotent, not a second unit against the quota.
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

// Unpublishes without deleting the row — branding/slug survive so
// re-publishing later doesn't mean reconfiguring from scratch.
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
