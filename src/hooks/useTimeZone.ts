"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { fetchAccount } from "@/lib/account";

// Shares Sidebar's account cache entry, so no extra round trip in the dashboard.
export function useTimeZone(): string {
  const [supabase] = useState(() => createClient());
  const { data } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => fetchAccount(supabase),
    staleTime: Infinity,
  });
  return data?.timeZone ?? "UTC";
}
