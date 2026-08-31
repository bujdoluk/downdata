"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import Logo from "@/components/navbar/Logo";
import { AlertIcon } from "@/components/icons/NavIcons";
import "./globals.css";

// This replaces the entire root layout when it fires, so it can't lean on
// anything that layout normally provides — no i18n (the crash could be in
// that provider itself), no next/font variables, no theme toggle beyond a
// copy of the pre-hydration script below. Deliberately hardcoded English
// rather than t() (see AGENTS.md's i18n rule) — this is the one page meant
// to still render if the app's own providers are what broke.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong · downDATA</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-base-100 text-base-content flex min-h-screen items-center justify-center p-6 antialiased">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="h-10 w-10" />
          <AlertIcon className="text-error h-12 w-12" />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-base-content/60 text-sm">An unexpected error occurred. You can try again, or head back home.</p>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={retry} className="btn btn-primary">
              Try again
            </button>
            <Link href="/" className="btn btn-outline">
              Back to downDATA
            </Link>
          </div>
          {error.digest && <p className="text-base-content/40 mt-2 text-xs">Ref: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
