"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { annualBilledTotal, discountedMonthlyPrice, PLAN_CATALOG } from "@/features/billing/services/plans";
import RevealOnScroll from "@/components/landing-page/RevealOnScroll";

const mono = "font-mono";

// A feature that doesn't exist yet, regardless of which tier claims it (see
// docs/specs/CAPABILITY-MAP-plan-tiers.md's admin-sso/authenticated-status-
// pages/api-access rows) — same "Coming soon" badge the free-tools Chrome
// extension card already established this session, reused here instead of
// a second copy of that markup.
function ComingSoonRow({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      {label} <span className="badge badge-ghost badge-sm">{t("common.comingSoon")}</span>
    </li>
  );
}

export default function PricingSection() {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);
  const interval = annual ? "year" : "month";

  const plans = [
    {
      key: "starter" as const,
      badge: null as string | null,
      ctaClass: "btn-outline",
      cardClass: "",
    },
    {
      key: "growth" as const,
      badge: null as string | null,
      ctaClass: "btn-outline",
      cardClass: "",
    },
  ];

  const freeEntry = PLAN_CATALOG.free;
  const teamEntry = PLAN_CATALOG.team;
  const businessEntry = PLAN_CATALOG.business;

  // Shared by Team/Business's price display below — both are real numbers
  // now (see plans.ts's own note on why `monthlyPrice` dropped `| null`),
  // shown through the same annual-toggle math the purchasable tiers use so
  // the whole row responds to the toggle consistently, even though neither
  // is actually purchasable yet.
  function priceDisplay(monthlyPrice: number) {
    return (annual ? discountedMonthlyPrice(monthlyPrice) : monthlyPrice).toFixed(2);
  }

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-[96rem] px-8">
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
            className="toggle toggle-info"
            checked={annual}
            onChange={(e) => setAnnual(e.target.checked)}
            aria-label={t("landing.pricing.annual")}
          />
          <span className={`flex items-center gap-2 text-sm font-medium ${annual ? "text-base-content" : "text-base-content/50"}`}>
            {t("landing.pricing.annual")}
            <span className="badge badge-success badge-soft">{t("landing.pricing.save20")}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* Free — no Stripe price, no /billing round trip; CTA goes straight to signup. */}
          <RevealOnScroll delayMs={0}>
            <div className="card card-border bg-base-200">
              <div className="card-body gap-6 p-8">
                <div className="flex flex-col gap-1">
                  <div className="text-base font-bold">{t("landing.pricing.free")}</div>
                  <div className={`text-4xl font-bold ${mono}`}>
                    $0<span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                  </div>
                  <div className="h-4" />
                </div>
                <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.monitors")} <span className={`${mono} text-base-content`}>{freeEntry.features.monitors}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.checkInterval")} <span className={`${mono} text-base-content`}>{freeEntry.features.checkInterval}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.boards")} <span className={`${mono} text-base-content`}>{freeEntry.features.boards}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.statusPages")} <span className={`${mono} text-base-content`}>{freeEntry.features.statusPages}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.adminUsers")} <span className={`${mono} text-base-content`}>{freeEntry.features.adminUsers}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.history")} <span className={`${mono} text-base-content`}>{freeEntry.features.history}</span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    {t("landing.pricing.integrations")} <span className={`${mono} text-base-content`}>{freeEntry.features.integrations}</span>
                  </li>
                </ul>
                <div className="card-actions">
                  <Link href="/login" className="btn btn-outline w-full rounded-full">
                    {t("landing.pricing.getStarted")}
                  </Link>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          {plans.map((plan, i) => {
            const catalogEntry = PLAN_CATALOG[plan.key];
            const monthlyPrice = catalogEntry.monthlyPrice;
            const rows: [string, string][] = [
              [t("landing.pricing.monitors"), catalogEntry.features.monitors],
              [t("landing.pricing.checkInterval"), catalogEntry.features.checkInterval],
              [t("landing.pricing.boards"), catalogEntry.features.boards === "unlimited" ? t("landing.pricing.unlimited") : catalogEntry.features.boards],
              [t("landing.pricing.statusPages"), catalogEntry.features.statusPages === "unlimited" ? t("landing.pricing.unlimited") : catalogEntry.features.statusPages],
              [t("landing.pricing.adminUsers"), catalogEntry.features.adminUsers === "unlimited" ? t("landing.pricing.unlimited") : catalogEntry.features.adminUsers],
              [t("landing.pricing.history"), catalogEntry.features.history],
              [t("landing.pricing.integrations"), catalogEntry.features.integrations],
            ];
            return (
              <RevealOnScroll key={plan.key} delayMs={(i + 1) * 80}>
              <div className={`card card-border bg-base-200 transition-transform duration-300 hover:-translate-y-1 ${plan.cardClass}`}>
                <div className="card-body gap-6 p-8">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-base font-bold">
                      {t(`landing.pricing.${plan.key}`)}
                      {plan.badge && <span className={`badge badge-info ${mono}`}>{plan.badge}</span>}
                    </div>
                    <div className={`text-4xl font-bold ${mono}`}>
                      ${priceDisplay(monthlyPrice)}
                      <span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                    </div>
                    <div className="text-base-content/50 h-4 text-xs">
                      {annual && t("landing.pricing.billedAnnually", { price: annualBilledTotal(monthlyPrice).toFixed(2) })}
                    </div>
                  </div>
                  <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                    {rows.map(([label, value]) => (
                      <li key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                        {label} <span className={`${mono} text-base-content`}>{value}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="card-actions">
                    <Link href={`/billing?plan=${plan.key}&interval=${interval}`} className={`btn ${plan.ctaClass} w-full rounded-full`}>
                      {catalogEntry.trialDays ? t("landing.pricing.startTrial") : t("landing.pricing.getStarted")}
                    </Link>
                  </div>
                </div>
              </div>
              </RevealOnScroll>
            );
          })}

          {/* Team — the recommended/highlighted card (moved here from Growth on request), same prominent treatment a purchasable featured tier gets. Still not actually purchasable (no Stripe price) — the disabled "Get notified" CTA is the one remaining signal of that, not a muted/dashed card shell. */}
          <RevealOnScroll delayMs={3 * 80}>
          <div className="card card-border bg-base-200 border-info/40 shadow-2xl transition-transform duration-300 hover:-translate-y-1">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-base font-bold">
                  {t("landing.pricing.team")}
                  <span className={`badge badge-info ${mono}`}>{t("landing.pricing.mostTeams")}</span>
                </div>
                <div className={`text-4xl font-bold ${mono}`}>
                  ${priceDisplay(teamEntry.monthlyPrice)}
                  <span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                </div>
                <div className="text-base-content/50 h-4 text-xs">
                  {annual && t("landing.pricing.billedAnnually", { price: annualBilledTotal(teamEntry.monthlyPrice).toFixed(2) })}
                </div>
              </div>
              <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.monitors")} <span className={`${mono} text-base-content`}>{teamEntry.features.monitors}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.checkInterval")} <span className={`${mono} text-base-content`}>{teamEntry.features.checkInterval}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.boards")} <span className={`${mono} text-base-content`}>{teamEntry.features.boards}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.statusPages")} <span className={`${mono} text-base-content`}>{teamEntry.features.statusPages}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.adminUsers")} <span className={`${mono} text-base-content`}>{teamEntry.features.adminUsers}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.history")} <span className={`${mono} text-base-content`}>{teamEntry.features.history}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.integrations")} <span className={`${mono} text-base-content`}>{teamEntry.features.integrations}</span>
                </li>
                <ComingSoonRow label={t("landing.pricing.adminSso")} />
                <ComingSoonRow label={t("landing.pricing.authenticatedStatusPages")} />
              </ul>
              <div className="card-actions">
                <button type="button" disabled className="btn btn-disabled w-full rounded-full">
                  {t("landing.pricing.getNotified")}
                </button>
              </div>
            </div>
          </div>
          </RevealOnScroll>

          {/* Business — in the making; real price now known, still not sellable (no Stripe price). */}
          <RevealOnScroll delayMs={4 * 80}>
          <div className="card card-border card-dash bg-base-200/60">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="text-base-content/70 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-base font-bold">
                  {t("landing.pricing.business")}
                  <span className={`badge badge-ghost ${mono}`}>{t("landing.pricing.inTheMaking")}</span>
                </div>
                <div className={`text-2xl font-bold ${mono}`}>
                  ${priceDisplay(businessEntry.monthlyPrice)}
                  <span className="text-base-content/50 text-base font-normal">{t("landing.pricing.perMonth")}</span>
                </div>
                <div className="text-base-content/50 h-4 text-xs">
                  {annual && t("landing.pricing.billedAnnually", { price: annualBilledTotal(businessEntry.monthlyPrice).toFixed(2) })}
                </div>
              </div>
              <ul className="text-base-content/50 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.monitors")} <span className={mono}>{businessEntry.features.monitors}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.checkInterval")} <span className={mono}>{businessEntry.features.checkInterval}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.boards")} <span className={mono}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.statusPages")} <span className={mono}>{t("landing.pricing.unlimited")}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.adminUsers")} <span className={mono}>{businessEntry.features.adminUsers}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.history")} <span className={mono}>{businessEntry.features.history}</span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  {t("landing.pricing.integrations")} <span className={mono}>{businessEntry.features.integrations}</span>
                </li>
                <ComingSoonRow label={t("landing.pricing.adminSso")} />
                <ComingSoonRow label={t("landing.pricing.authenticatedStatusPages")} />
                <ComingSoonRow label={t("landing.pricing.apiAccess")} />
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
          </RevealOnScroll>
        </div>

        <p className="text-base-content/70 mt-10 text-center text-sm">
          {t("landing.pricing.needMore")}{" "}
          <Link href="/support" className="link link-hover text-base-content font-medium">
            {t("landing.pricing.contactUs")}
          </Link>
        </p>
      </div>
    </section>
  );
}
