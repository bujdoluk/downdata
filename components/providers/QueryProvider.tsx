"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Per-mount instance, not module scope — a module-level QueryClient would
  // be shared across requests/users on the server otherwise.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // retry: 1, not the default 3 — closer to the single-attempt
        // behavior every hand-rolled fetch effect here used to have.
        defaultOptions: { queries: { retry: 1 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
