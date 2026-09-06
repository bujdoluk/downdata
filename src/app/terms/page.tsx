import type { Metadata } from "next";
import TermsContent from "@/components/landing-page/TermsContent";

const title = "Terms of Service — downDATA";
const description = "The terms that govern your use of downDATA.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title,
    description,
    url: "/terms",
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
  return <TermsContent />;
}
