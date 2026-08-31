"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Logo from "@/components/navbar/Logo";

export default function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Logo className="h-10 w-10" />
      <p className="text-primary text-6xl font-bold">404</p>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t("notFound.title")}</h1>
        <p className="text-base-content/60 text-sm">{t("notFound.description")}</p>
      </div>
      <Link href="/" className="btn btn-primary mt-2">
        {t("notFound.homeButton")}
      </Link>
    </div>
  );
}
