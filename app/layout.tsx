import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "downDATA",
  description: "Is GitHub up? A tiny service status monitor.",
};

// The service registry (lib/services.ts) is a JSON file read at request
// time, not a build-time constant — force every page to render dynamically
// so newly-added services show up without a rebuild.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          // Dark is the default (set statically above so there's no flash,
          // even without JS). Only override it if the user previously
          // chose light via the theme toggle.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-base-100 text-base-content flex min-h-screen flex-col antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
