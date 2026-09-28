import i18n from "./i18n";
import { defaultLanguageCode } from "./languages";

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

export async function loadLocale(code: string): Promise<void> {
  if (code === defaultLanguageCode || i18n.hasResourceBundle(code, "translation")) return;
  const loadLocaleModule = LOCALE_LOADERS[code];
  if (!loadLocaleModule) return;
  const localeModule = await loadLocaleModule();
  i18n.addResourceBundle(code, "translation", localeModule.default, true, true);
}
