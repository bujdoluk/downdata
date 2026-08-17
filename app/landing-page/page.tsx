import type { Metadata } from "next";
import LandingPage from "@/components/landing-page/LandingPage";

export const metadata: Metadata = {
  title: "downDATA — cheap, honest status monitoring",
};

export default function Page() {
  return <LandingPage />;
}
