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
          {/* Starter */}
          <div className="card card-border bg-base-200">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="text-base font-bold">{t("landing.pricing.starter")}</div>
                <div className={`text-4xl font-bold ${mono}`}>
                  ${annual ? annualMonthly(5) : 5}
                  <span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                </div>
                <div className="text-base-content/50 h-4 text-xs">
                  {annual && t("landing.pricing.billedAnnually", { price: annualMonthly(5) * 12 })}
                </div>
              </div>
              <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.monitors")} <span className={`${mono} text-base-content`}>50</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.checkInterval")} <span className={`${mono} text-base-content`}>15s</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.statusPages")} <span className={`${mono} text-base-content`}>5</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.teamSeats")} <span className={`${mono} text-base-content`}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.history")} <span className={`${mono} text-base-content`}>6 mo</span>
                </li>
              </ul>
              <div className="card-actions">
                <a href="#" className="btn btn-outline w-full rounded-full">
                  {t("landing.pricing.getStarted")}
                </a>
              </div>
            </div>
          </div>

          {/* Pro */}
          <div className="card card-border border-primary/40 bg-base-200 shadow-2xl">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-base font-bold">
                  {t("landing.pricing.pro")}
                  <span className={`badge badge-primary ${mono}`}>{t("landing.pricing.mostTeams")}</span>
                </div>
                <div className={`text-4xl font-bold ${mono}`}>
                  ${annual ? annualMonthly(15) : 15}
                  <span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                </div>
                <div className="text-base-content/50 h-4 text-xs">
                  {annual && t("landing.pricing.billedAnnually", { price: annualMonthly(15) * 12 })}
                </div>
              </div>
              <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.monitors")} <span className={`${mono} text-base-content`}>250</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.checkInterval")} <span className={`${mono} text-base-content`}>10s</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.statusPages")} <span className={`${mono} text-base-content`}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.teamSeats")} <span className={`${mono} text-base-content`}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex justify-between gap-4">
                  {t("landing.pricing.history")} <span className={`${mono} text-base-content`}>12 mo</span>
                </li>
              </ul>
              <div className="card-actions">
                <a href="#" className="btn btn-primary w-full rounded-full">
                  {t("landing.pricing.getStarted")}
                </a>
              </div>
            </div>
          </div>

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
