"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";

export default function FaqSection() {
  const { t } = useTranslation();

  const faqs = [
    { question: t("landing.faq.howItWorksQuestion"), answer: t("landing.faq.howItWorksAnswer") },
    { question: t("landing.faq.trialQuestion"), answer: t("landing.faq.trialAnswer") },
    { question: t("landing.faq.cancelQuestion"), answer: t("landing.faq.cancelAnswer") },
    { question: t("landing.faq.notificationsQuestion"), answer: t("landing.faq.notificationsAnswer") },
    { question: t("landing.faq.monitorCountQuestion"), answer: t("landing.faq.monitorCountAnswer") },
    { question: t("landing.faq.emailSmsQuestion"), answer: t("landing.faq.emailSmsAnswer") },
    { question: t("landing.faq.boardsQuestion"), answer: t("landing.faq.boardsAnswer") },
    { question: t("landing.faq.scopeQuestion"), answer: t("landing.faq.scopeAnswer") },
  ];

  return (
    <section id="faq" className="border-base-300 bg-base-200/40 border-t py-24">
      <div className="mx-auto max-w-6xl px-8">
        <div className="mx-auto mb-14 flex max-w-xl flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{t("landing.faq.heading")}</h2>
          <p className="text-base-content/70">{t("landing.faq.subtitle")}</p>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {faqs.map((faq, i) => (
            <div key={faq.question} className="collapse collapse-arrow border-base-300 bg-base-200 border">
              <input type="radio" name="faq-accordion" defaultChecked={i === 0} />
              <div className="collapse-title font-semibold">{faq.question}</div>
              <div className="collapse-content text-base-content/70 text-sm leading-relaxed">{faq.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
