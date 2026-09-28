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

  useEffect(() => {
    wantsVisibleRef.current = consent.supportChat;
  });

  useEffect(() => {
    // One-way ratchet driven by external (localStorage) consent, not derivable from state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (consent.supportChat) setHasLoadedOnce(true);
  }, [consent.supportChat]);

  useEffect(() => {
    window.__tawkApplyVisibility = applyVisibilityRef.current;
    return () => {
      delete window.__tawkApplyVisibility;
    };
  }, []);

  // Toggles during widget load are applied by Tawk_API.onLoad instead.
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
