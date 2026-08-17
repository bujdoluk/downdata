import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
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
  title: "downDATA",
  description: "Is GitHub up? A tiny service status monitor.",
};

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
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");var c=document.querySelector(".theme-controller");if(c)c.checked=true;}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${nunito.variable} ${geistMono.variable} bg-base-100 text-base-content overflow-x-hidden font-sans flex min-h-screen flex-col antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
