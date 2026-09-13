"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import ChromeLogo from "@/components/landing-page/ChromeLogo";

// Not built yet (see AGENTS.md/docs/specs/SPEC-free-tools.md's "Never" list:
// no working install link before the extension exists) — the Coming soon
// badge plus a disabled button say so honestly instead of a dead Chrome Web
// Store link or a button that quietly does nothing.
export default function ChromeExtensionCard() {
  const { t } = useTranslation();

  return (
    <div className="card card-border bg-base-200 mx-auto max-w-xl">
      <div className="card-body items-center text-center">
        <ChromeLogo size={48} />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <h1 className="text-3xl font-bold">{t("freeTools.chromeExtension.title")}</h1>
          <span className="badge badge-info">{t("common.comingSoon")}</span>
        </div>
        <p className="text-base-content/70 mt-2 max-w-md text-lg leading-relaxed">
          {t("freeTools.chromeExtension.body")}
        </p>
        <button type="button" className="btn btn-primary mt-4" disabled>
          {t("freeTools.chromeExtension.installButton")}
        </button>
      </div>
    </div>
  );
}
