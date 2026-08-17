import type { GB } from "country-flag-icons/react/1x1";

export type FlagComponent = typeof GB;

export interface LanguageOption {
  code: string;
  name: string;
  flag: FlagComponent;
}
