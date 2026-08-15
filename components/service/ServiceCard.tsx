"use client";

import { useEffect, useState } from "react";

type StatusIndicator = "none" | "minor" | "major" | "critical" | string;

type GithubStatusResponse = {
  status: {
    indicator: StatusIndicator;
    description: string;
  };
};

const POLL_INTERVAL_MS = 30_000;

const INDICATOR_STYLES: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  none: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Operational" },
  minor: { dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", label: "Minor issues" },
  major: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "Major outage" },
  critical: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Critical outage" },
};

function GithubLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.7.42.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.2.66.79.55A10.5 10.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

export default function ServiceCard() {
  const [data, setData] = useState<GithubStatusResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/github-status", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as GithubStatusResponse;
        if (!cancelled) {
          setData(json);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const indicator = data?.status.indicator ?? "unknown";
  const style = INDICATOR_STYLES[indicator];
  const isLoading = !data && !error;

  return (
    <div className="w-full max-w-xs border border-black/10 bg-black/5 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3 text-neutral-900 dark:text-white">
        <GithubLogo />
        <h1 className="text-base font-semibold">GitHub</h1>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            isLoading ? "animate-pulse bg-black/20 dark:bg-white/30" : error ? "bg-black/20 dark:bg-white/30" : style?.dot ?? "bg-black/20 dark:bg-white/30"
          }`}
        />
        <p
          className={`text-xs font-medium ${
            error || isLoading ? "text-neutral-500 dark:text-white/50" : (style?.text ?? "text-neutral-600 dark:text-white/70")
          }`}
        >
          {isLoading
            ? "Checking status…"
            : error
              ? "Unable to reach status API"
              : data?.status.description}
        </p>
      </div>
    </div>
  );
}
