"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Per mount, not module scope, or the server would share it across users.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dev-only, or devtools JS ships to every visitor. */}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
