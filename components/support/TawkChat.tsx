"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { CloseIcon } from "@/components/icons/NavIcons";

declare global {
  interface Window {
    __tawkApplyVisibility?: () => void;
  }
}

export default function TawkChat() {
  const { t } = useTranslation();
  const { consent, savePreferences } = useCookieConsent();
  const pathname = usePathname();
  const propertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
  const widgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID;
  const isSharedPage = pathname?.startsWith("/shared/");

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const wantsVisibleRef = useRef(consent.supportChat);

  const applyVisibilityRef = useRef(() => {
    if (wantsVisibleRef.current) window.Tawk_API?.showWidget?.();
    else window.Tawk_API?.hideWidget?.();
  });

  // Keeps the ref in sync without touching it during render (refs are for
  // effects/handlers, not render output) — runs after every commit.
  useEffect(() => {
    wantsVisibleRef.current = consent.supportChat;
  });

  useEffect(() => {
    // Intentional: "has consent ever been granted this session" is a one-way
    // ratchet driven entirely by an external signal (localStorage-backed
    // consent), not derivable from props/state alone — see CookieConsent.tsx's
    // own hydration-guard effect for the same pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (consent.supportChat) setHasLoadedOnce(true);
  }, [consent.supportChat]);

  useEffect(() => {
    window.__tawkApplyVisibility = applyVisibilityRef.current;
    return () => {
      delete window.__tawkApplyVisibility;
    };
  }, []);

  // Applies immediately for any toggle that happens after the widget has
  // already finished loading. A toggle that happens *while* it's still loading
  // is instead caught by Tawk_API.onLoad below, once hideWidget/showWidget exist.
  useEffect(() => {
    if (hasLoadedOnce) applyVisibilityRef.current();
  }, [consent.supportChat, hasLoadedOnce]);

  function handleDismiss() {
    savePreferences({ ...consent, supportChat: false });
  }

  if (!propertyId || !widgetId || isSharedPage || !hasLoadedOnce) return null;

  return (
    <>
      <Script id="tawk-to" strategy="lazyOnload">
        {`
          var Tawk_API = Tawk_API || {};
          Tawk_API.onLoad = function () {
            if (window.__tawkApplyVisibility) window.__tawkApplyVisibility();
          };
          var Tawk_LoadStart = new Date();
          (function () {
            var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src = "https://embed.tawk.to/${propertyId}/${widgetId}";
            s1.charset = "UTF-8";
            s1.setAttribute("crossorigin", "*");
            s0.parentNode.insertBefore(s1, s0);
          })();
        `}
      </Script>
      {consent.supportChat && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("support.hideChatButton")}
          title={t("support.hideChatButton")}
          className="btn btn-circle btn-xs bg-base-100 border-base-300 text-base-content/70 hover:text-base-content fixed right-3 bottom-[76px] z-[2147483002] border shadow-md"
        >
          <CloseIcon />
        </button>
      )}
    </>
  );
}
