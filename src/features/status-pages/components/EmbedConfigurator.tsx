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

// Same two constants, same reasoning, as NavigationLoadingBoundary's own
// delayed-loading overlay — reused deliberately rather than picked fresh,
// so this preview's loading feel matches the one other place in the app
// that already solved "don't flash a spinner for a load that finishes
// almost instantly" (this endpoint is revalidate: 60, so most switches
// resolve well under this). A load faster than SHOW_DELAY_MS never shows
// anything; one that does show stays up at least MIN_VISIBLE_MS so it
// never flickers on the way out either.
const SHOW_DELAY_MS = 300;
const MIN_VISIBLE_MS = 200;

// A stateless configurator, not a saved-integration form — no Save/
// Delete, nothing persisted. Every choice below is already fully encoded
// in the generated URL's query string (see api/badge/[boardSlug]/
// route.ts), so there's nothing this component needs to remember between
// visits; the code sample the user copies out *is* the saved state, same
// way a shields.io badge URL works. See the grilling session that
// settled this over a proposed board_embeds table + migration.
export default function EmbedConfigurator({ boards }: { boards: { boardId: string; boardName: string; slug: string }[] }) {
  const { t } = useTranslation();
  const origin = useOrigin();
  const { copied, copy } = useCopyToClipboard();

  const [boardSlug, setBoardSlug] = useState(boards[0]?.slug ?? "");
  const [variant, setVariant] = useState<BadgeVariant>("status");
  const [theme, setTheme] = useState<BadgeTheme>("light");
  const [size, setSize] = useState<BadgeSize>("medium");
  const [layout, setLayout] = useState<BadgeLayout>("flat");

  // badgePath is computed here (not below, past the empty-boards return)
  // so the loading-delay effect right after it can depend on it — hooks
  // can't follow a conditional return, and boards.length === 0 never
  // renders this value anyway.
  const query = new URLSearchParams({ type: variant, theme, size, layout }).toString();
  const badgePath = `/api/badge/${boardSlug}?${query}`;

  const [showSpinner, setShowSpinner] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);
  // Which src the spinner logic is currently waiting on — guards against a
  // stale onLoad/onError from a since-superseded src (the user clicked
  // another control before the previous image finished) marking the
  // *current* one settled.
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

  // Runs once on unmount only — the effect above already clears the show
  // timer on every badgePath change, this only needs to catch a hide timer
  // still pending when the component itself goes away.
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
    if (shownAtRef.current === null) return; // never made it past the show delay — nothing to hide
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
          {/* Plain <pre><code>, not a syntax-highlighting library — a
              one-line <img> tag has nothing worth highlighting, and this
              repo's own dependency ladder (AGENTS.md) means reaching for
              one just to get a copy button isn't justified. The button is
              a real sibling of <pre> inside this relative wrapper,
              absolutely positioned over its corner — visually "inside"
              the code block without the illegal nesting a <textarea>
              would have forced (a <button> can't be a DOM child of one). */}
          <div className="relative">
            {/* whitespace-pre-wrap + break-all, not overflow-x-auto — a
                long badge URL made the copy button (absolute, top-right)
                overlap the tail of the still-unscrolled text: pr-12 only
                reserves blank space at the very *end* of a scrollable
                line, not against wherever the button actually sits before
                the user scrolls. Wrapping means pr-12 is respected on
                every line, so the button's corner is never covered.
                Verified against a real render of this exact markup (see
                the session's own screenshot check), not assumed. */}
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

      {/* min-w/max-w, not just w-1/3: flex items default to
          min-width: auto, meaning a column won't shrink below its own
          content's intrinsic width — since the badge image's natural
          width varies with label/value text length, w-1/3 alone let the
          column itself get pushed wider (or snap back) as that content
          changed, moving the whole layout. Clamping both ends pins it to
          exactly 1/3 regardless of what the image inside happens to
          render at. No built-in Tailwind min-w-/max-w- utility covers a
          fraction like this (only named sizes), hence the arbitrary
          values. */}
      <div className="w-full lg:min-w-[33.333%] lg:max-w-[33.333%]">
        {/* No sticky here (deliberately removed) — sticky lets an element
            detach from its normal position and float against the
            viewport while the page scrolls, which pulled this card
            outside the Embeds tab panel's own bordered box. Plain normal
            flow + h-full keeps it exactly where its stretched flex-row
            sibling places it. */}
        <div className="card card-border bg-base-100 flex h-full flex-col items-center justify-center p-6">
          {showSpinner ? (
            <Spinner size="sm" />
          ) : (
            <span className="text-base-content/50 mb-3 text-xs font-semibold tracking-wide uppercase">{t("integrations.embeds.preview")}</span>
          )}
          {/* Hidden via class while loading, not unmounted — an unmounted
              <img> stops loading/never fires onLoad, which is exactly the
              event this whole spinner depends on to know when to hide
              itself again. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the point is to render exactly what the badge endpoint returns, not a Next-optimized copy of it */}
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
