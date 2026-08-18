"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceDefinition } from "@/types/service";
import ServiceGrid from "@/components/service/ServiceGrid";
import NoServicesMessage from "@/components/service/NoServicesMessage";

export default function MyServicesSection({ services }: { services: ServiceDefinition[] }) {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-base-content text-lg font-semibold">{t("monitors.myServices")}</h2>
      {services.length === 0 ? (
        <div className="mt-4">
          <NoServicesMessage />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(5px,1fr))] gap-4">
          <ServiceGrid services={services} />
        </div>
      )}
    </section>
  );
}
