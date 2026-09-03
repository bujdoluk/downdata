"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { AuthActionError, continueAnonymously } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon } from "@/components/icons/NavIcons";
import Spinner from "@/components/Spinner";
import MvpNavbar from "@/components/mvp/MvpNavbar";
import LiveDashboardPanel from "@/components/landing-page/LiveDashboardPanel";

const BULLET_KEYS = ["monitoring", "notifications", "boards", "history", "statusPage"] as const;

export default function MvpPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTryApp() {
    setError(null);
    setSubmitting(true);
    try {
      await continueAnonymously(supabase);
      router.push("/boards");
    } catch (err) {
      const code = err instanceof AuthActionError ? err.code : "generic";
      setError(t(`auth.errors.${code}`));
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-base-100 text-base-content flex h-dvh flex-col overflow-hidden">
      <MvpNavbar />

      <main className="flex flex-1 items-center justify-center overflow-hidden px-8">
        <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{t("mvp.title")}</h1>

            <ul className="flex w-full max-w-lg flex-col gap-3 text-left">
              {BULLET_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="bg-info/10 text-info mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  <span className="text-base-content/80 text-sm sm:text-base">{t(`mvp.bullets.${key}`)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex flex-col items-center gap-2 lg:items-start">
              <button type="button" onClick={handleTryApp} disabled={submitting} className="btn btn-info rounded-full shadow-lg">
                {submitting ? <Spinner size="xs" /> : t("mvp.cta")}
              </button>
              <span className="text-base-content/50 text-sm">{t("mvp.ctaHint")}</span>
              {error && <p className="text-error text-sm">{error}</p>}
            </div>
          </div>

          <LiveDashboardPanel className="hidden w-full max-w-md lg:block" />
        </div>
      </main>
    </div>
  );
}
