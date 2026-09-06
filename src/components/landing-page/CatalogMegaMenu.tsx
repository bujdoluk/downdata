"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";
import { ChevronDownIcon } from "@/components/icons/NavIcons";

const HOVER_CLOSE_DELAY_MS = 150;

// Features and Integrations are two independent <details> instances with no
// shared parent state — broadcasting the opened id here is how one opening
// closes the other, so only one mega menu is ever open at once.
const MEGA_MENU_OPENED_EVENT = "downdata:mega-menu-opened";

export default function CatalogMegaMenu<T extends { slug: string }>({
  label,
  entries,
  hrefPrefix,
  menuClassName,
  renderIcon,
  renderLabel,
  renderDescription,
}: {
  label: string;
  entries: T[];
  hrefPrefix: string;
  menuClassName: string;
  renderIcon: (entry: T) => ReactNode;
  renderLabel: (entry: T) => ReactNode;
  renderDescription: (entry: T) => ReactNode;
}) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  useCloseDetailsOnOutsideClick(detailsRef, () => setOpen(false));

  useEffect(() => {
    function handleSiblingOpened(event: Event) {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    }
    document.addEventListener(MEGA_MENU_OPENED_EVENT, handleSiblingOpened);
    return () => document.removeEventListener(MEGA_MENU_OPENED_EVENT, handleSiblingOpened);
  }, [id]);

  useEffect(() => {
    if (open) document.dispatchEvent(new CustomEvent(MEGA_MENU_OPENED_EVENT, { detail: id }));
  }, [open, id]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function clearPendingClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  // Hover opens/closes the menu alongside the native click toggle below;
  // guarded by (hover: hover) so a tap on a touch device isn't read as a
  // hover-open immediately followed by the tap's own toggle closing it again.
  function handleMouseEnter() {
    if (!window.matchMedia("(hover: hover)").matches) return;
    clearPendingClose();
    setOpen(true);
  }

  function handleMouseLeave() {
    if (!window.matchMedia("(hover: hover)").matches) return;
    clearPendingClose();
    // Debounced: the dropdown sits a few pixels below the label (mt-3), so an
    // instant close would fire while the mouse is still crossing that gap.
    closeTimeoutRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="dropdown dropdown-end"
    >
      <summary className="text-base-content/70 hover:text-base-content flex cursor-pointer list-none items-center gap-1 transition-colors">
        {label}
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </summary>
      <ul
        className={`dropdown-content bg-base-100 border-base-300 z-30 mt-3 grid list-none grid-cols-1 gap-1 rounded-box border p-2 shadow-xl
          max-xl:fixed max-xl:inset-x-4 max-xl:top-28 max-xl:mt-0 max-xl:w-auto max-xl:max-h-[70vh] max-xl:overflow-y-auto ${menuClassName}`}
      >
        {entries.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`${hrefPrefix}/${entry.slug}`}
              onClick={() => setOpen(false)}
              className="hover:bg-base-200 flex items-start gap-3 rounded-lg p-2.5 transition-colors"
            >
              {renderIcon(entry)}
              <span>
                <span className="text-base-content block text-sm font-medium">{renderLabel(entry)}</span>
                <span className="text-base-content/60 mt-0.5 block text-xs leading-snug">{renderDescription(entry)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
