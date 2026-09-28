"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useOrigin } from "@/features/status-pages/hooks/useOrigin";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { CopyIcon, CheckIcon } from "@/components/icons/NavIcons";
import SelectDropdown from "@/components/SelectDropdown";
import Spinner from "@/components/Spinner";
import type { BadgeLayout, BadgeSize, BadgeTheme, BadgeVariant } from "@/features/status-pages/services/badge";

const VARIANTS: BadgeVariant[] = ["status", "uptime"];
const THEMES: BadgeTheme[] = ["light", "dark"];
const SIZES: BadgeSize[] = ["small", "medium", "large"];
const LAYOUTS: BadgeLayout[] = ["flat", "card"];

// Same values as NavigationLoadingBoundary: no spinner for fast loads, and no flicker once shown.
const SHOW_DELAY_MS = 300;
const MIN_VISIBLE_MS = 200;

// Stateless on purpose: every choice is encoded in the badge URL, so nothing needs persisting.
export default function EmbedConfigurator({ boards }: { boards: { boardId: string; boardName: string; slug: string }[] }) {
  const { t } = useTranslation();
  const origin = useOrigin();
  const { copied, copy } = useCopyToClipboard();

  const [boardSlug, setBoardSlug] = useState(boards[0]?.slug ?? "");
  const [variant, setVariant] = useState<BadgeVariant>("status");
  const [theme, setTheme] = useState<BadgeTheme>("light");
  const [size, setSize] = useState<BadgeSize>("medium");
  const [layout, setLayout] = useState<BadgeLayout>("flat");

  // Computed before the empty-boards return because the effect below depends on it.
  const query = new URLSearchParams({ type: variant, theme, size, layout }).toString();
  const badgePath = `/api/badge/${boardSlug}?${query}`;

  const [showSpinner, setShowSpinner] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);
  // Ignores a stale onLoad/onError from a superseded src.
  const pendingSrcRef = useRef(badgePath);

  useEffect(() => {
    pendingSrcRef.current = badgePath;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      shownAtRef.current = Date.now();
      setShowSpinner(true);
    }, SHOW_DELAY_MS);
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [badgePath]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  function handleImageSettled(src: string) {
    if (src !== pendingSrcRef.current) return;
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (shownAtRef.current === null) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAtRef.current));
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      shownAtRef.current = null;
      setShowSpinner(false);
    }, remaining);
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-base-content/60 text-sm">{t("integrations.embeds.empty")}</p>
        <Link href="/status-pages" className="btn btn-outline btn-info btn-sm">
          {t("integrations.embeds.emptyCta")}
        </Link>
      </div>
    );
  }

  const badgeUrl = `${origin}${badgePath}`;
  const code = `<img src="${badgeUrl}" alt="${t("integrations.embeds.altText")}" />`;

  return (
    <div className="flex flex-col items-stretch gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-base-content text-sm font-semibold">{t("integrations.embeds.explanationTitle")}</h3>
          <p className="text-base-content/60 text-sm">{t("integrations.embeds.explanationBody")}</p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("integrations.embeds.board")}</span>
          <SelectDropdown
            ariaLabel={t("integrations.embeds.board")}
            value={boardSlug}
            onChange={setBoardSlug}
            options={boards.map((board) => ({ value: board.slug, label: board.boardName }))}
            className="w-full max-w-xs"
          />
        </div>

        {(
          [
            { label: t("integrations.embeds.variant"), value: variant, onChange: setVariant, options: VARIANTS, key: "variant" },
            { label: t("integrations.embeds.theme"), value: theme, onChange: setTheme, options: THEMES, key: "theme" },
            { label: t("integrations.embeds.size"), value: size, onChange: setSize, options: SIZES, key: "size" },
            { label: t("integrations.embeds.layout"), value: layout, onChange: setLayout, options: LAYOUTS, key: "layout" },
          ] as const
        ).map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{group.label}</span>
            <div className="join">
              {group.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => (group.onChange as (value: string) => void)(option)}
                  className={`btn join-item btn-sm ${group.value === option ? "btn-info" : "btn-outline btn-info"}`}
                >
                  {t(`integrations.embeds.${group.key}${option.charAt(0).toUpperCase()}${option.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2">
          <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("integrations.embeds.codeSampleTitle")}</span>
          <div className="relative">
            {/* Wrapping, not overflow-x-auto: pr-12 then clears the copy button on every line. */}
            <pre className="bg-[var(--color-surface-2)] border-base-300 rounded-box border p-3 pr-12 text-xs whitespace-pre-wrap break-all">
              <code>{code}</code>
            </pre>
            <button
              type="button"
              onClick={() => copy(code)}
              className="btn btn-ghost btn-xs absolute top-2 right-2"
              aria-label={t("integrations.copy")}
            >
              {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* min-w/max-w, not w-1/3: min-width:auto let the badge's varying width resize the column. */}
      <div className="w-full lg:min-w-[33.333%] lg:max-w-[33.333%]">
        {/* No sticky: it pulled the card outside the Embeds tab panel's box. */}
        <div className="card card-border bg-base-100 flex h-full flex-col items-center justify-center p-6">
          {showSpinner ? (
            <Spinner size="sm" />
          ) : (
            <span className="text-base-content/50 mb-3 text-xs font-semibold tracking-wide uppercase">{t("integrations.embeds.preview")}</span>
          )}
          {/* Hidden, not unmounted: an unmounted <img> never fires the onLoad the spinner waits for. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- must show exactly what the badge endpoint returns */}
          <img
            src={badgePath}
            alt={t("integrations.embeds.altText")}
            className={showSpinner ? "hidden" : ""}
            onLoad={(event) => handleImageSettled(event.currentTarget.getAttribute("src") ?? "")}
            onError={(event) => handleImageSettled(event.currentTarget.getAttribute("src") ?? "")}
          />
        </div>
      </div>
    </div>
  );
}
