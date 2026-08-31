"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useHasMounted } from "@/hooks/useHasMounted";

export interface ConsentChoices {
  analytics: boolean;
  supportChat: boolean;
}

const STORAGE_KEY = "cookieConsent";
const DEFAULT_CHOICES: ConsentChoices = { analytics: false, supportChat: false };

function loadStoredConsent(): ConsentChoices | null {
  try {
    const consent = window.localStorage.getItem(STORAGE_KEY);
    if (!consent) return null;
    const parsed = JSON.parse(consent);
    return {
      analytics: Boolean(parsed.analytics),
      supportChat: Boolean(parsed.supportChat),
    };
  } catch {
    return null;
  }
}

function storeConsent(choices: ConsentChoices) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  } catch {

  }
}

interface CookieConsentContextValue {
  consent: ConsentChoices;
  hasDecided: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (choices: ConsentChoices) => void;
  openPreferences: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<ConsentChoices>(DEFAULT_CHOICES);
  const [hasDecided, setHasDecided] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(DEFAULT_CHOICES);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useHasMounted();

  useEffect(() => {
    const stored = loadStoredConsent();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConsent(stored);
      setHasDecided(true);
    }
  }, []);

  useEffect(() => {
    if (preferencesOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [preferencesOpen]);

  function commit(choices: ConsentChoices) {
    setConsent(choices);
    setHasDecided(true);
    storeConsent(choices);
    setPreferencesOpen(false);
  }

  function acceptAll() {
    commit({ analytics: true, supportChat: true });
  }

  function rejectAll() {
    commit({ analytics: false, supportChat: false });
  }

  function openPreferences() {
    setDraft(consent);
    setPreferencesOpen(true);
  }

  return (
    <CookieConsentContext.Provider
      value={{ consent, hasDecided, acceptAll, rejectAll, savePreferences: commit, openPreferences }}
    >
      {children}

      {mounted && !hasDecided && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4">
          <div className="card bg-base-100 border-base-300 mx-auto max-w-2xl border shadow-lg">
            <div className="card-body gap-3 p-5">
              <h2 className="text-base font-bold">{t("cookieConsent.title")}</h2>
              <p className="text-base-content/70 text-sm">{t("cookieConsent.description")}</p>
              <p className="text-base-content/70 text-sm">
                <Trans
                  i18nKey="cookieConsent.privacyNotice"
                  components={{ privacyLink: <Link href="/privacy" className="link" /> }}
                />
              </p>
              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={rejectAll}>
                  {t("cookieConsent.rejectAll")}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={openPreferences}>
                  {t("cookieConsent.customize")}
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={acceptAll}>
                  {t("cookieConsent.acceptAll")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mounted && (
        <dialog
          ref={dialogRef}
          className="modal"
          onClose={() => setPreferencesOpen(false)}
        >
          <div className="modal-box">
            <h3 className="text-lg font-bold">{t("cookieConsent.customize")}</h3>

            <div className="divide-base-300 mt-4 divide-y">
              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{t("cookieConsent.necessaryTitle")}</p>
                  <p className="text-base-content/60 text-sm">
                    {t("cookieConsent.necessaryDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-sm mt-1 shrink-0"
                  checked
                  disabled
                  aria-label={t("cookieConsent.necessaryTitle")}
                />
              </div>

              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{t("cookieConsent.analyticsTitle")}</p>
                  <p className="text-base-content/60 text-sm">
                    {t("cookieConsent.analyticsDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary mt-1 shrink-0"
                  checked={draft.analytics}
                  onChange={(event) => setDraft((prev) => ({ ...prev, analytics: event.target.checked }))}
                  aria-label={t("cookieConsent.analyticsTitle")}
                />
              </div>

              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{t("cookieConsent.supportChatTitle")}</p>
                  <p className="text-base-content/60 text-sm">
                    {t("cookieConsent.supportChatDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary mt-1 shrink-0"
                  checked={draft.supportChat}
                  onChange={(event) => setDraft((prev) => ({ ...prev, supportChat: event.target.checked }))}
                  aria-label={t("cookieConsent.supportChatTitle")}
                />
              </div>
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-sm" onClick={() => setPreferencesOpen(false)}>
                {t("cookieConsent.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => commit(draft)}
              >
                {t("cookieConsent.save")}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setPreferencesOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </CookieConsentContext.Provider>
  );
}
