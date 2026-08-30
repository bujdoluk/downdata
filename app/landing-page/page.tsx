import type { Metadata } from "next";
import LandingPage from "@/components/landing-page/LandingPage";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "downDATA — cheap, honest status monitoring",
};

export default async function Page() {
  const catalog = await getCatalog();
  return <LandingPage catalogCount={catalog.length} />;
}
