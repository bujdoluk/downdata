"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { fetchAccount } from "@/lib/account";

// The account's chosen display timezone, defaulting to UTC — both before
// the query resolves and for an account that's never set one. Same
// queryKeys.account() cache entry Sidebar's own account query uses
// (staleTime: Infinity there too), so this doesn't cost an extra network
// round trip on pages where Sidebar — always mounted in
// app/(dashboard)/layout.tsx — already populated it.
export function useTimeZone(): string {
  const [supabase] = useState(() => createClient());
  const { data } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => fetchAccount(supabase),
    staleTime: Infinity,
  });
  return data?.timeZone ?? "UTC";
}
