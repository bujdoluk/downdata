import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import { defaultLanguageCode } from "./languages";

// Only the default locale is bundled; others load on demand (loadLocale) since all 13 were ~13x the weight.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: defaultLanguageCode,
    fallbackLng: defaultLanguageCode,
    interpolation: { escapeValue: false },
  });
}

export default i18n;
