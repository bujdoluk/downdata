import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_EXACT = new Set([
  "/landing-page",
  "/mvp",
  "/login",
  "/reset-password",
  "/privacy",
  "/terms",
  "/about",
  "/faq",
  "/support",
  "/pricing",
  "/blog",
  // Clicked from an email client with possibly no session; the token is the authorization.
  "/api/integrations/email/verify",
  // Stripe carries no session; the webhook signature is the authorization.
  "/api/billing/webhook",
  // Called from the anonymous landing page; a session is read when present, not required.
  "/api/requests",
  // Public reference data for logged-out navbar search and footer.
  "/api/catalog",
  // Otherwise crawlers get redirected to /login; the matcher doesn't exempt it.
  "/robots.txt",
]);
// "/integrations/" matches only marketing pages; the bare "/integrations"
// dashboard page stays gated.
const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/cron/",
  "/features/",
  "/integrations/",
  "/free-tools/",
  "/blog/",
  "/status/",
  "/api/public/status/",
  "/services/",
  "/api/summary/",
  "/api/status/",
  "/api/badge/",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  // No session to refresh and gated by their own secret/signature; skip the
  // auth round trip so a slow auth call can't eat the cron timeout budget.
  if (request.nextUrl.pathname.startsWith("/api/cron/") || request.nextUrl.pathname === "/api/billing/webhook") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;

  if (!data?.claims && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/landing-page", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    // Keep the query string, or e.g. /billing?plan=... loses the chosen plan.
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
