"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Spinner from "@/components/Spinner";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@/lib/formatTime";
import { isBillingInterval, isPlanTier, PLAN_CATALOG } from "@/lib/plans";
import type { BillingInterval, PlanTier, Subscription } from "@/types/subscription";

async function postJson<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  return data as T;
}

type CancelResult = { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: "billing.status.active",
  trialing: "billing.status.trialing",
  past_due: "billing.status.pastDue",
  canceled: "billing.status.canceled",
  unpaid: "billing.status.unpaid",
  paused: "billing.status.paused",
  incomplete: "billing.status.incomplete",
};

export default function BillingPageContent({
  initialSubscription,
  timeZone,
}: {
  initialSubscription: Subscription | null;
  timeZone: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const confirmRef = useRef<HTMLDialogElement>(null);
  const autoCheckoutTriggered = useRef(false);

  const { data: subscription } = useQuery({
    queryKey: queryKeys.subscription(),
    queryFn: () => fetchJson<Subscription | null>("/api/billing/subscription"),
    initialData: initialSubscription,
  });

  const checkoutParam = searchParams.get("checkout");
  const planParam = searchParams.get("plan");
  const intervalParam = searchParams.get("interval");

  // Clears ?checkout=success|canceled after showing its banner — same
  // query-param-driven feedback pattern as IntegrationsPageContent.
  useEffect(() => {
    if (checkoutParam) router.replace("/billing");
  }, [checkoutParam, router]);

  const checkoutMutation = useMutation({
    mutationFn: (input: { plan: PlanTier; interval: BillingInterval }) =>
      postJson<{ url: string }>("/api/billing/checkout", input, t("billing.somethingWrong")),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  // Arriving from a landing-page "Get started" click (/billing?plan=pro&
  // interval=month) auto-starts checkout instead of making the visitor
  // pick the same plan again — still safe, since Stripe's own hosted page
  // requires explicit payment confirmation before anything is charged.
  useEffect(() => {
    if (autoCheckoutTriggered.current || subscription) return;
    if (planParam && isPlanTier(planParam) && intervalParam && isBillingInterval(intervalParam) && PLAN_CATALOG[planParam].available) {
      autoCheckoutTriggered.current = true;
      checkoutMutation.mutate({ plan: planParam, interval: intervalParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkoutMutation.mutate is stable; including the mutation object itself would re-run this on every mutation state change
  }, [subscription, planParam, intervalParam, checkoutMutation.mutate]);

  const cancelMutation = useMutation({
    mutationFn: (action: "cancel" | "resume") => postJson<CancelResult>("/api/billing/cancel", { action }, t("billing.somethingWrong")),
    onSuccess: (result) => {
      queryClient.setQueryData<Subscription | null>(queryKeys.subscription(), (prev) => (prev ? { ...prev, ...result } : prev));
      confirmRef.current?.close();
    },
  });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-base-content text-lg font-semibold">{t("billing.title")}</h1>

      {checkoutParam === "success" && <p className="alert alert-success alert-soft text-sm">{t("billing.checkoutSuccess")}</p>}
      {checkoutParam === "canceled" && <p className="alert alert-warning alert-soft text-sm">{t("billing.checkoutCanceled")}</p>}
      {checkoutMutation.error && <p className="alert alert-error alert-soft text-sm">{checkoutMutation.error.message}</p>}
      {cancelMutation.error && <p className="alert alert-error alert-soft text-sm">{cancelMutation.error.message}</p>}

      {subscription ? (
        <CurrentPlanCard
          subscription={subscription}
          timeZone={timeZone}
          onCancel={() => confirmRef.current?.showModal()}
          onResume={() => cancelMutation.mutate("resume")}
          isResuming={cancelMutation.isPending}
        />
      ) : (
        <FreeTierCard />
      )}

      <dialog ref={confirmRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("billing.confirmCancelTitle")}</h3>
          <p className="text-base-content/70 mt-2 text-sm">{t("billing.confirmCancelMessage")}</p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                {t("account.cancel")}
              </button>
              <button type="button" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate("cancel")} className="btn btn-error btn-sm">
                {cancelMutation.isPending ? <Spinner size="xs" /> : t("billing.cancelSubscription")}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("account.cancel")}</button>
        </form>
      </dialog>
    </div>
  );
}

function CurrentPlanCard({
  subscription,
  timeZone,
  onCancel,
  onResume,
  isResuming,
}: {
  subscription: Subscription;
  timeZone: string;
  onCancel: () => void;
  onResume: () => void;
  isResuming: boolean;
}) {
  const { t } = useTranslation();
  const statusKey = STATUS_LABEL_KEYS[subscription.status] ?? "billing.status.other";

  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <div className="divide-base-300 divide-y">
          <div className="flex items-center justify-between py-3">
            <span className="text-base-content/60 text-sm">{t("billing.currentPlan")}</span>
            <span className="badge badge-lg badge-primary font-semibold">{t(`landing.pricing.${subscription.plan}`)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-base-content/60 text-sm">{t("billing.statusLabel")}</span>
            <span className="text-sm font-medium">{t(statusKey, { status: subscription.status })}</span>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex items-center justify-between py-3">
              <span className="text-base-content/60 text-sm">{subscription.cancelAtPeriodEnd ? t("billing.endsOn") : t("billing.renewsOn")}</span>
              <span className={`text-sm font-medium ${subscription.cancelAtPeriodEnd ? "text-warning" : ""}`}>
                {formatDateTime(subscription.currentPeriodEnd, timeZone)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          {subscription.cancelAtPeriodEnd ? (
            <button type="button" className="btn btn-outline btn-sm" disabled={isResuming} onClick={onResume}>
              {isResuming ? <Spinner size="xs" /> : t("billing.resumeSubscription")}
            </button>
          ) : (
            <button type="button" className="btn btn-outline btn-error btn-sm" onClick={onCancel}>
              {t("billing.cancelSubscription")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// No plan-picking UI here — that only lives on the public pricing page
// (components/landing-page/PricingSection.tsx). This page is purely for
// managing an existing subscription; a free-tier account just gets
// pointed at /pricing to choose one.
function FreeTierCard() {
  const { t } = useTranslation();

  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <h2 className="text-base font-semibold">{t("billing.freePlanTitle")}</h2>
        <p className="text-base-content/60 mt-1 text-sm">{t("billing.freePlanSubtitle")}</p>
        <div className="card-actions mt-4">
          <Link href="/pricing" className="btn btn-primary btn-sm">
            {t("billing.viewPlans")}
          </Link>
        </div>
      </div>
    </div>
  );
}
