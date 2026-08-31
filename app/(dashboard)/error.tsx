"use client"; // Error boundaries must be Client Components

import ErrorContent from "@/components/ErrorContent";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center-safe justify-center p-6">
      <ErrorContent error={error} retry={retry} />
    </main>
  );
}
