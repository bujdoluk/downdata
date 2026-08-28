"use client";

import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import FaqSection from "@/components/landing-page/FaqSection";

export default function FaqContent() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <FaqSection />
      <Footer />
    </div>
  );
}
