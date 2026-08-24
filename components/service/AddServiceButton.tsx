"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { PlusIcon } from "@/components/icons/NavIcons";

export default function AddServiceButton() {
  const { t } = useTranslation();

  return (
    <Link href="/add-service" className="btn btn-info btn-sm">
      <PlusIcon />
      {t("nav.addService")}
    </Link>
  );
}
