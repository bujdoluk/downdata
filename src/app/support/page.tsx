import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import SupportContent from "@/components/landing-page/SupportContent";

const title = "Support — downDATA";
const description = "Get help with downDATA — live chat, email, or the FAQ.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title,
    description,
    url: "/support",
    siteName: "downDATA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SupportContent isAuthenticated={Boolean(user)} />;
}
