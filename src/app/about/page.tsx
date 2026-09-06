import type { Metadata } from "next";
import AboutContent from "@/components/landing-page/AboutContent";

const title = "About — downDATA";
const description = "The story behind downDATA and who's building it.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title,
    description,
    url: "/about",
    siteName: "downDATA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function Page() {
  return <AboutContent />;
}
