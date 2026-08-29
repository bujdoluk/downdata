import type { Metadata } from "next";
import PricingContent from "@/components/landing-page/PricingContent";

const title = "Pricing — downDATA";
const description = "Simple, transparent pricing for downDATA's status monitoring.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title,
    description,
    url: "/pricing",
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
  return <PricingContent />;
}
