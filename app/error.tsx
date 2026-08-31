"use client"; // Error boundaries must be Client Components

import ErrorContent from "@/components/ErrorContent";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="bg-base-100 text-base-content flex flex-1 items-center justify-center p-6">
      <ErrorContent error={error} retry={retry} />
    </main>
  );
}
