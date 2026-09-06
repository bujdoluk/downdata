import type { Metadata } from "next";
import PrivacyContent from "@/components/landing-page/PrivacyContent";

const title = "Privacy Policy — downDATA";
const description = "How downDATA collects, uses, and protects your information.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title,
    description,
    url: "/privacy",
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
  return <PrivacyContent />;
}
