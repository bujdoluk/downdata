import { createClient } from "@/lib/supabase/server";

// This app has no RBAC/roles system at all (see AGENTS.md) — blog posts
// are the one thing a regular signed-up account must never be able to
// write, so this is a narrow, single-purpose gate (one env-configured
// owner email) rather than a new permissions layer. Session-scoped client,
// not the service-role one: this only needs to know who the caller is,
// the same way every other route reads the current user
// (supabase.auth.getUser()).
export async function isAdminUser(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === adminEmail;
}
