"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";

const mono = "font-mono";
const ANNUAL_DISCOUNT = 0.2;

function annualMonthly(monthly: number) {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT));
}

export default function PricingSection() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      key: "starter" as const,
      price: 5,
      badge: null as string | null,
      ctaClass: "btn-outline",
      cardClass: "",
      rows: [
        [t("landing.pricing.monitors"), "50"],
        [t("landing.pricing.checkInterval"), "15s"],
        [t("landing.pricing.statusPages"), "5"],
        [t("landing.pricing.teamSeats"), t("landing.pricing.unlimited")],
        [t("landing.pricing.history"), "6 mo"],
      ],
    },
    {
      key: "pro" as const,
      price: 15,
      badge: t("landing.pricing.mostTeams"),
      ctaClass: "btn-primary",
      cardClass: "border-primary/40 shadow-2xl",
      rows: [
        [t("landing.pricing.monitors"), "250"],
        [t("landing.pricing.checkInterval"), "10s"],
        [t("landing.pricing.statusPages"), t("landing.pricing.unlimited")],
        [t("landing.pricing.teamSeats"), t("landing.pricing.unlimited")],
        [t("landing.pricing.history"), "12 mo"],
      ],
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-8">
        <div className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{t("landing.pricing.heading")}</h2>
          <p className="text-base-content/70">{t("landing.pricing.subtitle")}</p>
        </div>

        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${annual ? "text-base-content/50" : "text-base-content"}`}>
            {t("landing.pricing.monthly")}
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={annual}
            onChange={(e) => setAnnual(e.target.checked)}
            aria-label={t("landing.pricing.annual")}
          />
          <span className={`flex items-center gap-2 text-sm font-medium ${annual ? "text-base-content" : "text-base-content/50"}`}>
            {t("landing.pricing.annual")}
            <span className="badge badge-success badge-soft">{t("landing.pricing.save20")}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.key} className={`card card-border bg-base-200 ${plan.cardClass}`}>
              <div className="card-body gap-6 p-8">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-base font-bold">
                    {t(`landing.pricing.${plan.key}`)}
                    {plan.badge && <span className={`badge badge-primary ${mono}`}>{plan.badge}</span>}
                  </div>
                  <div className={`text-4xl font-bold ${mono}`}>
                    ${annual ? annualMonthly(plan.price) : plan.price}
                    <span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                  </div>
                  <div className="text-base-content/50 h-4 text-xs">
                    {annual && t("landing.pricing.billedAnnually", { price: annualMonthly(plan.price) * 12 })}
                  </div>
                </div>
                <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                  {plan.rows.map(([label, value]) => (
                    <li key={label} className="flex justify-between gap-4">
                      {label} <span className={`${mono} text-base-content`}>{value}</span>
                    </li>
                  ))}
                </ul>
                <div className="card-actions">
                  <a href="#" className={`btn ${plan.ctaClass} w-full rounded-full`}>
                    {t("landing.pricing.getStarted")}
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Business — in the making; unaffected by the billing toggle */}
          <div className="card card-border card-dash bg-base-200/60">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="text-base-content/70 flex items-center justify-between text-base font-bold">
                  {t("landing.pricing.business")}
                  <span className={`badge badge-ghost ${mono}`}>{t("landing.pricing.inTheMaking")}</span>
                </div>
                <div className="text-base-content/50 text-2xl font-bold">{t("landing.pricing.pricingTBD")}</div>
                <div className="h-4" />
              </div>
              <ul className="text-base-content/50 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.monitors")} <span className={mono}>1,000</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.checkInterval")} <span className={mono}>5s</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.statusPages")} <span className={mono}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.teamSeats")} <span className={mono}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.history")} <span className={mono}>24 mo</span>
                </li>
              </ul>
              <div className="border-base-300 text-base-content/50 border-t border-dashed pt-4 text-xs">
                {t("landing.pricing.businessNote")}
              </div>
              <div className="card-actions">
                <button type="button" disabled className="btn btn-disabled w-full rounded-full">
                  {t("landing.pricing.getNotified")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-base-content/70 mt-10 text-center text-sm">
          {t("landing.pricing.needMore")}{" "}
          <a href="#" className="link link-hover text-base-content font-medium">
            {t("landing.pricing.selfHostedLicense")}
          </a>
        </p>
      </div>
    </section>
  );
}
