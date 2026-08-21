import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy on purpose: importing this module must never fail just because
// Supabase isn't configured yet — only actually calling this (from the
// poller/notifier, never from client code) should throw.
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  return createClient(url, key);
}
