import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import ClientNavigationTracker from "@/components/providers/ClientNavigationTracker";
import { CookieConsentProvider } from "@/components/cookies/CookieConsent";
import ConsentedAnalytics from "@/components/cookies/ConsentedAnalytics";
import TawkChat from "@/components/support/TawkChat";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "downDATA",
  description: "Is GitHub up? A tiny service status monitor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");document.querySelectorAll(".theme-controller").forEach(function(c){c.checked=true;});}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${nunito.variable} ${geistMono.variable} bg-base-100 text-base-content overflow-x-hidden font-sans flex min-h-screen flex-col antialiased`}
      >
        <ClientNavigationTracker />
        <QueryProvider>
          <CookieConsentProvider>
            {children}
            <ConsentedAnalytics />
            <TawkChat />
          </CookieConsentProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
