import i18n from "./i18n";
import { defaultLanguageCode } from "./languages";

// One dynamic import per non-default locale — keeps each locale its own
// chunk, fetched only when a visitor actually switches to it, instead of
// i18n.ts bundling all 13 into every page's JS (see that file's comment).
const LOCALE_LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  sk: () => import("./locales/sk.json"),
  cs: () => import("./locales/cs.json"),
  de: () => import("./locales/de.json"),
  pl: () => import("./locales/pl.json"),
  pt: () => import("./locales/pt.json"),
  ru: () => import("./locales/ru.json"),
  es: () => import("./locales/es.json"),
  it: () => import("./locales/it.json"),
  fr: () => import("./locales/fr.json"),
  sv: () => import("./locales/sv.json"),
  nb: () => import("./locales/nb.json"),
  nl: () => import("./locales/nl.json"),
};

// Called from LanguageSwitcher.tsx before every i18n.changeLanguage() —
// a no-op once a locale's already loaded (or for the default locale,
// which i18n.ts bundles synchronously), so this is safe to call on every
// switch without tracking loaded-state elsewhere.
export async function loadLocale(code: string): Promise<void> {
  if (code === defaultLanguageCode || i18n.hasResourceBundle(code, "translation")) return;
  const loadLocaleModule = LOCALE_LOADERS[code];
  if (!loadLocaleModule) return;
  const localeModule = await loadLocaleModule();
  i18n.addResourceBundle(code, "translation", localeModule.default, true, true);
}
