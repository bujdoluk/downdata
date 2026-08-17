"use client";

import { useState } from "react";

const mono = "font-mono";
const ANNUAL_DISCOUNT = 0.2;

function annualMonthly(monthly: number) {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT));
}

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-8">
        <div className="mx-auto mb-10 flex max-w-xl flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Pricing</h2>
          <p className="text-base-content/70">
            Instead, a real 14-day trial with full access — no card required. Pick
            a plan when you&rsquo;re ready, not before.
          </p>
        </div>

        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${annual ? "text-base-content/50" : "text-base-content"}`}>
            Monthly
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={annual}
            onChange={(e) => setAnnual(e.target.checked)}
            aria-label="Toggle annual billing"
          />
          <span className={`flex items-center gap-2 text-sm font-medium ${annual ? "text-base-content" : "text-base-content/50"}`}>
            Annual
            <span className="badge badge-success badge-soft">Save 20%</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card card-border bg-base-200">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="text-base font-bold">Starter</div>
                <div className={`text-4xl font-bold ${mono}`}>
                  ${annual ? annualMonthly(5) : 5}
                  <span className="text-base-content/50 text-base font-normal">/mo</span>
                </div>
                <div className="text-base-content/50 h-4 text-xs">
                  {annual && `billed annually · $${annualMonthly(5) * 12}/yr`}
                </div>
              </div>
              <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex justify-between gap-4">
                  Monitors <span className={`${mono} text-base-content`}>50</span>
                </li>
                <li className="flex justify-between gap-4">
                  Check interval <span className={`${mono} text-base-content`}>15s</span>
                </li>
                <li className="flex justify-between gap-4">
                  Status pages <span className={`${mono} text-base-content`}>5</span>
                </li>
                <li className="flex justify-between gap-4">
                  Team seats <span className={`${mono} text-base-content`}>Unlimited</span>
                </li>
                <li className="flex justify-between gap-4">
                  History <span className={`${mono} text-base-content`}>6 mo</span>
                </li>
              </ul>
              <div className="card-actions">
                <a href="#" className="btn btn-outline w-full rounded-full">
                  Get started
                </a>
              </div>
            </div>
          </div>

          <div className="card card-border border-primary/40 bg-base-200 shadow-2xl">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-base font-bold">
                  Pro
                  <span className={`badge badge-primary ${mono}`}>Most teams</span>
                </div>
                <div className={`text-4xl font-bold ${mono}`}>
                  ${annual ? annualMonthly(15) : 15}
                  <span className="text-base-content/50 text-base font-normal">/mo</span>
                </div>
                <div className="text-base-content/50 h-4 text-xs">
                  {annual && `billed annually · $${annualMonthly(15) * 12}/yr`}
                </div>
              </div>
              <ul className="text-base-content/70 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex justify-between gap-4">
                  Monitors <span className={`${mono} text-base-content`}>250</span>
                </li>
                <li className="flex justify-between gap-4">
                  Check interval <span className={`${mono} text-base-content`}>10s</span>
                </li>
                <li className="flex justify-between gap-4">
                  Status pages <span className={`${mono} text-base-content`}>Unlimited</span>
                </li>
                <li className="flex justify-between gap-4">
                  Team seats <span className={`${mono} text-base-content`}>Unlimited</span>
                </li>
                <li className="flex justify-between gap-4">
                  History <span className={`${mono} text-base-content`}>12 mo</span>
                </li>
              </ul>
              <div className="card-actions">
                <a href="#" className="btn btn-primary w-full rounded-full">
                  Get started
                </a>
              </div>
            </div>
          </div>

          <div className="card card-border card-dash bg-base-200/60">
            <div className="card-body gap-6 p-8">
              <div className="flex flex-col gap-1">
                <div className="text-base-content/70 flex items-center justify-between text-base font-bold">
                  Business
                  <span className={`badge badge-ghost ${mono}`}>In the making</span>
                </div>
                <div className="text-base-content/50 text-2xl font-bold">Pricing TBD</div>
                <div className="h-4" />
              </div>
              <ul className="text-base-content/50 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex justify-between gap-4">
                  Monitors <span className={mono}>1,000</span>
                </li>
                <li className="flex justify-between gap-4">
                  Check interval <span className={mono}>5s</span>
                </li>
                <li className="flex justify-between gap-4">
                  Status pages <span className={mono}>Unlimited</span>
                </li>
                <li className="flex justify-between gap-4">
                  Team seats <span className={mono}>Unlimited</span>
                </li>
                <li className="flex justify-between gap-4">
                  History <span className={mono}>24 mo</span>
                </li>
              </ul>
              <div className="border-base-300 text-base-content/50 border-t border-dashed pt-4 text-xs">
                SSO, audit logs, and priority support are still being built. Leave your
                email and we&rsquo;ll tell you the day it ships.
              </div>
              <div className="card-actions">
                <button type="button" disabled className="btn btn-disabled w-full rounded-full">
                  Get notified
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-base-content/70 mt-10 text-center text-sm">
          Need more than 1,000 monitors, or want to run it yourself?{" "}
          <a href="#" className="link link-hover text-base-content font-medium">
            Ask about a self-hosted license.
          </a>
        </p>
      </div>
    </section>
  );
}
