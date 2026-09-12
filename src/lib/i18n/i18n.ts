import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import { defaultLanguageCode } from "./languages";

// Only the default locale is bundled eagerly — the other 12 are ~13x the
// weight of one (136KB vs 9.8KB gzipped, measured) and this module is
// imported by nearly every client component in the app, so shipping all
// 13 to every visitor regardless of their language was pure waste. Every
// other locale loads on demand via loadLocale() (see that file), called
// from LanguageSwitcher.tsx before it ever calls i18n.changeLanguage().
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: defaultLanguageCode,
    fallbackLng: defaultLanguageCode,
    interpolation: { escapeValue: false },
  });
}

export default i18n;
