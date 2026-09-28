"use client";

import type { FreeToolSlug } from "@/lib/freeToolsCatalog";
import { resolveFreeTool } from "@/lib/freeToolsCatalog";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import Footer from "@/components/landing-page/Footer";

export default function FreeToolPageContent({ slug }: { slug: FreeToolSlug }) {
  const tool = resolveFreeTool(slug);
  if (!tool) return null;
  const Content = tool.Content;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Content />
      </div>
      <Footer />
    </div>
  );
}
