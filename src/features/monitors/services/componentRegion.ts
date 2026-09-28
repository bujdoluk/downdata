import type { StatuspageComponent } from "@/types/service";

// Heuristic: Statuspage has no geography field, so this infers one from names.
// Most components name a feature, not a place, and correctly resolve to null.
export type Continent =
  | "africa"
  | "asia"
  | "australia"
  | "europe"
  | "latinAmerica"
  | "middleEastAfrica"
  | "northAmerica"
  | "southAmerica";

export const ALL_CONTINENTS: Continent[] = [
  "africa",
  "asia",
  "australia",
  "europe",
  "latinAmerica",
  "middleEastAfrica",
  "northAmerica",
  "southAmerica",
];

export const CONTINENT_LABEL_KEYS: Record<Continent, string> = {
  africa: "serviceDetail.continentAfrica",
  asia: "serviceDetail.continentAsia",
  // Covers all of Oceania; there's no separate bucket.
  australia: "serviceDetail.continentAustralia",
  europe: "serviceDetail.continentEurope",
  // Own bucket: Twilio's "Voice, Latin America" leaves span North and South
  // America and have no child countries to resolve instead.
  latinAmerica: "serviceDetail.continentLatinAmerica",
  // Own bucket for the same reason: Twilio's "Middle East & Africa" spans two.
  middleEastAfrica: "serviceDetail.continentMiddleEastAfrica",
  northAmerica: "serviceDetail.continentNorthAmerica",
  southAmerica: "serviceDetail.continentSouthAmerica",
};

// Transcontinental countries (Russia, Turkey, Georgia, Egypt, ...) get one
// deliberate pick each: a judgment call, not a geographic claim.
const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  algeria: "africa", angola: "africa", benin: "africa", botswana: "africa",
  "burkina faso": "africa", burundi: "africa", cameroon: "africa", "cabo verde": "africa", "cape verde": "africa",
  "central african republic": "africa", chad: "africa", comoros: "africa",
  "democratic republic of the congo": "africa", "dr congo": "africa", congo: "africa",
  djibouti: "africa", egypt: "africa", "equatorial guinea": "africa", eritrea: "africa", eswatini: "africa", swaziland: "africa",
  ethiopia: "africa", gabon: "africa", gambia: "africa", ghana: "africa", guinea: "africa", "guinea-bissau": "africa",
  "ivory coast": "africa", "cote d'ivoire": "africa", "côte d'ivoire": "africa", kenya: "africa", lesotho: "africa",
  liberia: "africa", libya: "africa", madagascar: "africa", malawi: "africa", mali: "africa", mauritania: "africa",
  mauritius: "africa", morocco: "africa", mozambique: "africa", namibia: "africa", niger: "africa", nigeria: "africa",
  rwanda: "africa", "sao tome and principe": "africa", senegal: "africa", seychelles: "africa", "sierra leone": "africa",
  somalia: "africa", "south africa": "africa", "south sudan": "africa", sudan: "africa", tanzania: "africa", togo: "africa",
  tunisia: "africa", uganda: "africa", zambia: "africa", zimbabwe: "africa",

  afghanistan: "asia", armenia: "asia", azerbaijan: "asia", bahrain: "asia", bangladesh: "asia", bhutan: "asia",
  brunei: "asia", cambodia: "asia", china: "asia", cyprus: "asia", georgia: "asia", "hong kong": "asia",
  india: "asia", indonesia: "asia", iran: "asia", iraq: "asia", israel: "asia", japan: "asia", jordan: "asia",
  kazakhstan: "asia", kuwait: "asia", kyrgyzstan: "asia", laos: "asia", lebanon: "asia", macau: "asia",
  malaysia: "asia", maldives: "asia", mongolia: "asia", myanmar: "asia", nepal: "asia", "north korea": "asia",
  oman: "asia", pakistan: "asia", palestine: "asia", philippines: "asia", qatar: "asia", "saudi arabia": "asia",
  singapore: "asia", "south korea": "asia", "korea, south": "asia", "sri lanka": "asia", syria: "asia", taiwan: "asia",
  tajikistan: "asia", thailand: "asia", "timor-leste": "asia", turkey: "asia", turkmenistan: "asia",
  "united arab emirates": "asia", uae: "asia", uzbekistan: "asia", vietnam: "asia", yemen: "asia",

  australia: "australia", "new zealand": "australia", fiji: "australia", "papua new guinea": "australia",
  "solomon islands": "australia", vanuatu: "australia", samoa: "australia", tonga: "australia", kiribati: "australia",
  micronesia: "australia", palau: "australia", "marshall islands": "australia", nauru: "australia", tuvalu: "australia",
  "new caledonia": "australia", guam: "australia",

  albania: "europe", andorra: "europe", austria: "europe", belarus: "europe", belgium: "europe",
  "bosnia and herzegovina": "europe", bulgaria: "europe", croatia: "europe", "czech republic": "europe", czechia: "europe",
  denmark: "europe", estonia: "europe", finland: "europe", france: "europe", germany: "europe", greece: "europe",
  hungary: "europe", iceland: "europe", ireland: "europe", italy: "europe", kosovo: "europe", latvia: "europe",
  liechtenstein: "europe", lithuania: "europe", luxembourg: "europe", malta: "europe", moldova: "europe",
  monaco: "europe", montenegro: "europe", netherlands: "europe", "north macedonia": "europe", norway: "europe",
  poland: "europe", portugal: "europe", romania: "europe", russia: "europe", "russian federation": "europe",
  "san marino": "europe", serbia: "europe", slovakia: "europe", slovenia: "europe", spain: "europe", sweden: "europe",
  switzerland: "europe", ukraine: "europe", "united kingdom": "europe", uk: "europe", "great britain": "europe",
  england: "europe", scotland: "europe", wales: "europe", "northern ireland": "europe", "vatican city": "europe",

  canada: "northAmerica", "united states": "northAmerica", "united states of america": "northAmerica",
  usa: "northAmerica", us: "northAmerica", mexico: "northAmerica", guatemala: "northAmerica", belize: "northAmerica",
  honduras: "northAmerica", "el salvador": "northAmerica", nicaragua: "northAmerica", "costa rica": "northAmerica",
  panama: "northAmerica", cuba: "northAmerica", jamaica: "northAmerica", haiti: "northAmerica",
  "dominican republic": "northAmerica", bahamas: "northAmerica", barbados: "northAmerica",
  "trinidad and tobago": "northAmerica", "puerto rico": "northAmerica", greenland: "northAmerica",

  argentina: "southAmerica", bolivia: "southAmerica", brazil: "southAmerica", chile: "southAmerica",
  colombia: "southAmerica", ecuador: "southAmerica", guyana: "southAmerica", paraguay: "southAmerica",
  peru: "southAmerica", suriname: "southAmerica", uruguay: "southAmerica", venezuela: "southAmerica",
  "french guiana": "southAmerica",
  grenada: "northAmerica",
};

// Cloudflare's "Latin America & the Caribbean" group isn't matched on purpose:
// its children are real countries and resolve on their own.
const CONTINENT_NAME_PATTERNS: [RegExp, Continent][] = [
  // Must precede the plain "africa" pattern, which would otherwise match first.
  [/(?=.*\bmiddle east\b)(?=.*\bafrica\b)/i, "middleEastAfrica"],
  [/\blatin america\b/i, "latinAmerica"],
  [/\bafrica\b/i, "africa"],
  [/\basia([- ]pacific)?\b|\bapac\b|\bmiddle east\b/i, "asia"],
  [/\baustralia\b|\boceania\b/i, "australia"],
  [/\beurope(an)?\b/i, "europe"],
  [/\bnorth america\b/i, "northAmerica"],
  [/\bsouth america\b/i, "southAmerica"],
];

// Exact codes, not a prefix regex: "ap-" spans Asia and Australia
// (ap-southeast-2/4 are Sydney/Melbourne).
const CLOUD_REGION_CODES: Record<string, Continent> = {
  "us-east-1": "northAmerica", "us-east-2": "northAmerica", "us-west-1": "northAmerica", "us-west-2": "northAmerica",
  "us-gov-east-1": "northAmerica", "us-gov-west-1": "northAmerica",
  "ca-central-1": "northAmerica", "ca-west-1": "northAmerica",
  "eu-west-1": "europe", "eu-west-2": "europe", "eu-west-3": "europe", "eu-central-1": "europe", "eu-central-2": "europe",
  "eu-north-1": "europe", "eu-south-1": "europe", "eu-south-2": "europe",
  "ap-northeast-1": "asia", "ap-northeast-2": "asia", "ap-northeast-3": "asia",
  "ap-southeast-1": "asia", "ap-south-1": "asia", "ap-south-2": "asia", "ap-east-1": "asia",
  "me-south-1": "asia", "me-central-1": "asia",
  "ap-southeast-2": "australia", "ap-southeast-4": "australia",
  "sa-east-1": "southAmerica",
  "af-south-1": "africa",
};

// Linode's "US-East (Newark)" convention. Exact table for the same reason as
// CLOUD_REGION_CODES: Linode's AP-Southeast is Sydney.
const LEADING_REGION_CODES: Record<string, Continent> = {
  "us-east": "northAmerica", "us-central": "northAmerica", "us-west": "northAmerica", "us-southeast": "northAmerica",
  "us-iad": "northAmerica", "us-iad-2": "northAmerica", "us-ord": "northAmerica", "us-sea": "northAmerica",
  "us-mia": "northAmerica", "us-lax": "northAmerica", "us-den": "northAmerica", "us-hou": "northAmerica",
  "ca-central": "northAmerica", "mx-qro": "northAmerica",
  "eu-west": "europe", "eu-central": "europe", "fr-par": "europe", "fr-par-2": "europe", "fr-mrs": "europe",
  "de-fra-2": "europe", "de-ham": "europe", "gb-lon": "europe", "it-mil": "europe", "es-mad": "europe",
  "nl-ams": "europe", "se-sto": "europe",
  "ap-south": "asia", "ap-west": "asia", "ap-northeast": "asia", "ap-northeast-2": "asia", "jp-osa": "asia",
  "jp-tyo-3": "asia", "in-maa": "asia", "in-bom-2": "asia", "my-kul": "asia", "id-cgk": "asia", "sg-sin-2": "asia",
  "ap-southeast": "australia", "au-mel": "australia", "nz-akl": "australia",
  "br-gru": "southAmerica", "co-bog": "southAmerica", "cl-scl": "southAmerica",
  "za-jnb": "africa",
};

// Anchored so a code-shaped substring elsewhere in a name can't match.
const LEADING_REGION_CODE_PATTERN = /^([a-z]{2}(?:-[a-z0-9]+){1,2})\s+\(/;

// Bare leading word like Sentry's "US Errors Alerting". Not reusing
// COUNTRY_TO_CONTINENT, which would misfire on names starting "Chad", "Peru", ...
const LEADING_ABBREVIATION_WORDS: Record<string, Continent> = {
  us: "northAmerica",
  eu: "europe",
};
const LEADING_ABBREVIATION_PATTERN = /^([a-z]{2})\b/;

const CODE_SUFFIX = /\s*-\s*\([^)]*\)\s*$/;

function matchContinentLiteral(name: string): Continent | null {
  for (const [pattern, continent] of CONTINENT_NAME_PATTERNS) {
    if (pattern.test(name)) return continent;
  }
  return null;
}

function matchName(name: string): Continent | null {
  const withoutCode = name.replace(CODE_SUFFIX, "");
  const segments = withoutCode.split(",");
  const candidate = segments[segments.length - 1]?.trim().toLowerCase();
  if (candidate) {
    const byCountry = COUNTRY_TO_CONTINENT[candidate];
    if (byCountry) return byCountry;
  }

  const literal = matchContinentLiteral(name);
  if (literal) return literal;

  const lower = name.toLowerCase();
  for (const [code, continent] of Object.entries(CLOUD_REGION_CODES)) {
    if (lower.includes(code)) return continent;
  }

  const leadingCodeMatch = LEADING_REGION_CODE_PATTERN.exec(lower);
  const leadingCode = leadingCodeMatch?.[1];
  if (leadingCode) {
    const byLeadingCode = LEADING_REGION_CODES[leadingCode];
    if (byLeadingCode) return byLeadingCode;
  }

  const leadingWordMatch = LEADING_ABBREVIATION_PATTERN.exec(lower);
  const leadingWord = leadingWordMatch?.[1];
  if (leadingWord) {
    const byLeadingWord = LEADING_ABBREVIATION_WORDS[leadingWord];
    if (byLeadingWord) return byLeadingWord;
  }

  return null;
}

// Only checks one level up: Statuspage groups never nest deeper.
export function inferComponentContinent(
  component: StatuspageComponent,
  componentsById: Map<string, StatuspageComponent>,
): Continent | null {
  const parent = component.group_id ? componentsById.get(component.group_id) : undefined;

  // A continent-named parent group is the provider's own classification and
  // beats our country guess (Cloudflare files "Tbilisi, Georgia" under Europe).
  if (parent) {
    const parentLiteral = matchContinentLiteral(parent.name);
    if (parentLiteral) return parentLiteral;
  }

  const own = matchName(component.name);
  if (own) return own;

  if (parent) return matchName(parent.name);

  return null;
}
