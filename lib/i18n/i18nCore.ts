import i18next from "i18next";
import cs from "./locales/cs.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import nb from "./locales/nb.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import sk from "./locales/sk.json";
import sv from "./locales/sv.json";
import { defaultLanguageCode } from "./languages";

const resources = {
  en: { translation: en },
  sk: { translation: sk },
  cs: { translation: cs },
  de: { translation: de },
  pl: { translation: pl },
  pt: { translation: pt },
  ru: { translation: ru },
  es: { translation: es },
  it: { translation: it },
  fr: { translation: fr },
  sv: { translation: sv },
  nb: { translation: nb },
  nl: { translation: nl },
};

const i18nCore = i18next.createInstance();
if (!i18nCore.isInitialized) {
  i18nCore.init({
    resources,
    lng: defaultLanguageCode,
    fallbackLng: defaultLanguageCode,
    interpolation: { escapeValue: false },
  });
}

export default i18nCore;
