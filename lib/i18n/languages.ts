import { GB, SK, CZ, DE, PL, PT, RU, ES, IT, FR, SE, NO, NL } from "country-flag-icons/react/1x1";
import type { LanguageOption } from "@/types/i18n";

const flags = { GB, SK, CZ, DE, PL, PT, RU, ES, IT, FR, SE, NO, NL };

const languageDefinitions = [
  { code: "en", name: "English (UK)", country: "GB" },
  { code: "sk", name: "Slovak", country: "SK" },
  { code: "cs", name: "Czech", country: "CZ" },
  { code: "de", name: "German", country: "DE" },
  { code: "pl", name: "Polish", country: "PL" },
  { code: "pt", name: "Portuguese", country: "PT" },
  { code: "ru", name: "Russian", country: "RU" },
  { code: "es", name: "Spanish", country: "ES" },
  { code: "it", name: "Italian", country: "IT" },
  { code: "fr", name: "French", country: "FR" },
  { code: "sv", name: "Swedish", country: "SE" },
  { code: "nb", name: "Norwegian", country: "NO" },
  { code: "nl", name: "Dutch", country: "NL" },
] as const;

export const languages: LanguageOption[] = languageDefinitions.map(
  ({ code, name, country }) => ({
    code,
    name,
    flag: flags[country as keyof typeof flags],
  }),
);

export const defaultLanguageCode = "en";

export function getLanguage(code: string): LanguageOption {
  // `languages` is a fixed, non-empty literal array, so the fallback is
  // always safe.
  return languages.find((language) => language.code === code) ?? languages[0]!;
}
