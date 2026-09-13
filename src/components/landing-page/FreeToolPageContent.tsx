"use client";

import type { FreeToolSlug } from "@/lib/freeToolsCatalog";
import { resolveFreeTool } from "@/lib/freeToolsCatalog";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import Footer from "@/components/landing-page/Footer";

// The generic page chrome (navbar/footer/container) every free tool shares —
// the tool-specific body is whatever Content its catalog entry names (see
// lib/freeToolsCatalog.ts's own comment on why that's per-entry, not one
// shared template like CatalogDetailPage).
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
