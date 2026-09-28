"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { requestJson } from "@/lib/fetchJson";
import Spinner from "@/components/Spinner";

export default function StatusPagePasswordGate({ slug, requiresPassword }: { slug: string; requiresPassword: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // On success, router.refresh() re-renders the server page with the new unlock cookie.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestJson(`/api/public/status/${slug}/unlock`, t("statusPageGate.genericError"), {
        method: "POST",
        body: { password },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("statusPageGate.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  // No password means only the IP allowlist applies, so there's nothing to enter.
  if (!requiresPassword) {
    return (
      <div className="card card-border bg-base-200 w-full max-w-sm">
        <div className="card-body items-center text-center">
          <h1 className="text-xl font-bold">{t("statusPageGate.restrictedTitle")}</h1>
          <p className="text-base-content/70 text-sm">{t("statusPageGate.restrictedDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-border bg-base-200 w-full max-w-sm">
      <div className="card-body">
        <h1 className="text-center text-xl font-bold">{t("statusPageGate.title")}</h1>
        <p className="text-base-content/70 text-center text-sm">{t("statusPageGate.description")}</p>

        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("statusPageGate.passwordPlaceholder")}
            className="input input-bordered w-full"
            autoFocus
          />

          {error && (
            <div role="alert" className="alert alert-error alert-soft py-2 text-xs">
              <span className="break-words">{error}</span>
            </div>
          )}

          <button type="submit" disabled={submitting || !password} className="btn btn-primary">
            {submitting ? <Spinner size="xs" /> : t("statusPageGate.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
