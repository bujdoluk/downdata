import { NextResponse } from "next/server";
import { getStatusPageProtectionBySlug } from "@/features/status-pages/services/statusPages";
import { getClientIp, signUnlockCookie, unlockCookieName, verifyPassword } from "@/features/status-pages/services/passwordProtection";
import { checkRateLimit, recordFailedAttempt } from "@/features/status-pages/services/rateLimit";

const UNLOCK_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // lasts until cleared or the password changes

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const protection = await getStatusPageProtectionBySlug(slug);
  if (!protection) {
    return NextResponse.json({ error: "Status page not found." }, { status: 404 });
  }
  if (protection.passwordHash === null) {
    return NextResponse.json({ error: "This status page doesn't require a password." }, { status: 400 });
  }

  const clientIp = getClientIp(request.headers);
  // An unresolved IP is grouped under "" rather than skipped, so unidentified clients are still rate-limited.
  const rateLimitKey = clientIp ?? "";
  const { limited, existing } = await checkRateLimit(protection.id, rateLimitKey);
  if (limited) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const correct = await verifyPassword(password, protection.passwordHash);
  if (!correct) {
    await recordFailedAttempt(protection.id, rateLimitKey, existing);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ unlocked: true });
  response.cookies.set(unlockCookieName(slug), signUnlockCookie(protection.id, protection.passwordHash), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
