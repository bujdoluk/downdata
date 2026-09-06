import type { Metadata } from "next";
import { getAllKeywordWatches, getAllSourceSettings, getMatchesForOwnKeywords } from "@/lib/earlyWarnings";
import EarlyWarningsPageContent from "@/components/early-warnings/EarlyWarningsPageContent";

export const metadata: Metadata = {
  title: "Early Warnings · downDATA",
};

export default async function EarlyWarningsPage() {
  const [keywords, sources, matches] = await Promise.all([getAllKeywordWatches(), getAllSourceSettings(), getMatchesForOwnKeywords()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <EarlyWarningsPageContent initialKeywords={keywords} initialSources={sources} initialMatches={matches} />
    </main>
  );
}
