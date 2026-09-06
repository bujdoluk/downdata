import type { Metadata } from "next";
import FaqContent from "@/components/landing-page/FaqContent";

const title = "FAQ — downDATA";
const description = "Answers to common questions about downDATA.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title,
    description,
    url: "/faq",
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
  return <FaqContent />;
}
