import { createClient } from "@/lib/supabase/server";

// No RBAC in this app, so blog writes get one narrow env-configured owner-email gate.
export async function isAdminUser(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === adminEmail;
}
