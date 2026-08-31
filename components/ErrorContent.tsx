"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Logo from "@/components/navbar/Logo";
import { AlertIcon } from "@/components/icons/NavIcons";

export default function ErrorContent({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Logo className="h-10 w-10" />
      <AlertIcon className="text-error h-12 w-12" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t("error.title")}</h1>
        <p className="text-base-content/60 text-sm">{t("error.description")}</p>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={retry} className="btn btn-primary">
          {t("error.retryButton")}
        </button>
        <Link href="/" className="btn btn-outline">
          {t("error.homeButton")}
        </Link>
      </div>
    </div>
  );
}
