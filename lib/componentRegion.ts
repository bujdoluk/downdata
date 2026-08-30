import type { StatuspageComponent } from "@/types/service";

// Best-effort geography for a Statuspage component. Statuspage has no
// geography field at all (see StatuspageComponent) — this infers one from
// free-text names, so it's a heuristic, not a guarantee: most components
// (most services, even) name a feature, not a place, and correctly resolve
// to `null` rather than being force-fit into a continent.
export type Continent = "africa" | "asia" | "australia" | "europe" | "northAmerica" | "southAmerica";

export const ALL_CONTINENTS: Continent[] = ["africa", "asia", "australia", "europe", "northAmerica", "southAmerica"];

export const CONTINENT_LABEL_KEYS: Record<Continent, string> = {
  africa: "serviceDetail.continentAfrica",
  asia: "serviceDetail.continentAsia",
  // Covers all of Oceania (NZ, Fiji, PNG, ...), not just the country —
  // there's no separate "Oceania" bucket, matches how this was asked for.
  australia: "serviceDetail.continentAustralia",
  europe: "serviceDetail.continentEurope",
  northAmerica: "serviceDetail.continentNorthAmerica",
  southAmerica: "serviceDetail.continentSouthAmerica",
};

// Common country names (plus frequent aliases/abbreviations actually seen
// on real status pages) mapped to the continent they're in, lowercased.
// A handful of transcontinental countries (Russia, Turkey, Kazakhstan,
// Azerbaijan, Georgia, Cyprus, Egypt) get one deliberate pick each rather
// than being silently guessed — a judgment call, not a geographic claim.
const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  // Africa
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

  // Asia (including the Middle East)
  afghanistan: "asia", armenia: "asia", azerbaijan: "asia", bahrain: "asia", bangladesh: "asia", bhutan: "asia",
  brunei: "asia", cambodia: "asia", china: "asia", cyprus: "asia", georgia: "asia", "hong kong": "asia",
  india: "asia", indonesia: "asia", iran: "asia", iraq: "asia", israel: "asia", japan: "asia", jordan: "asia",
  kazakhstan: "asia", kuwait: "asia", kyrgyzstan: "asia", laos: "asia", lebanon: "asia", macau: "asia",
  malaysia: "asia", maldives: "asia", mongolia: "asia", myanmar: "asia", nepal: "asia", "north korea": "asia",
  oman: "asia", pakistan: "asia", palestine: "asia", philippines: "asia", qatar: "asia", "saudi arabia": "asia",
  singapore: "asia", "south korea": "asia", "korea, south": "asia", "sri lanka": "asia", syria: "asia", taiwan: "asia",
  tajikistan: "asia", thailand: "asia", "timor-leste": "asia", turkey: "asia", turkmenistan: "asia",
  "united arab emirates": "asia", uae: "asia", uzbekistan: "asia", vietnam: "asia", yemen: "asia",

  // Australia / Oceania
  australia: "australia", "new zealand": "australia", fiji: "australia", "papua new guinea": "australia",
  "solomon islands": "australia", vanuatu: "australia", samoa: "australia", tonga: "australia", kiribati: "australia",
  micronesia: "australia", palau: "australia", "marshall islands": "australia", nauru: "australia", tuvalu: "australia",
  "new caledonia": "australia", guam: "australia",

  // Europe
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

  // North America
  canada: "northAmerica", "united states": "northAmerica", "united states of america": "northAmerica",
  usa: "northAmerica", us: "northAmerica", mexico: "northAmerica", guatemala: "northAmerica", belize: "northAmerica",
  honduras: "northAmerica", "el salvador": "northAmerica", nicaragua: "northAmerica", "costa rica": "northAmerica",
  panama: "northAmerica", cuba: "northAmerica", jamaica: "northAmerica", haiti: "northAmerica",
  "dominican republic": "northAmerica", bahamas: "northAmerica", barbados: "northAmerica",
  "trinidad and tobago": "northAmerica", "puerto rico": "northAmerica", greenland: "northAmerica",

  // South America
  argentina: "southAmerica", bolivia: "southAmerica", brazil: "southAmerica", chile: "southAmerica",
  colombia: "southAmerica", ecuador: "southAmerica", guyana: "southAmerica", paraguay: "southAmerica",
  peru: "southAmerica", suriname: "southAmerica", uruguay: "southAmerica", venezuela: "southAmerica",
  "french guiana": "southAmerica",
  grenada: "northAmerica",
};

// Covers a component/group whose name already *is* the continent (Cloudflare
// groups its regions this way) or a well-known synonym for one. "Latin
// America & the Caribbean" is deliberately not here — it spans North and
// South America, but its children (real country names) each resolve
// correctly on their own via COUNTRY_TO_CONTINENT, so the group's own
// ambiguity never actually matters.
const CONTINENT_NAME_PATTERNS: [RegExp, Continent][] = [
  [/\bafrica\b/i, "africa"],
  [/\basia([- ]pacific)?\b|\bapac\b|\bmiddle east\b/i, "asia"],
  [/\baustralia\b|\boceania\b/i, "australia"],
  [/\beurope(an)?\b/i, "europe"],
  [/\bnorth america\b/i, "northAmerica"],
  [/\bsouth america\b/i, "southAmerica"],
];

// Exact AWS-style region codes actually seen on status pages. Deliberately
// an exact table, not a "us-"/"eu-"/"ap-" prefix regex — AWS's ap- prefix
// alone spans both Asia and Australia (ap-southeast-2/4 are Sydney/
// Melbourne), so a prefix match would mislabel those two.
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

const CODE_SUFFIX = /\s*-\s*\([^)]*\)\s*$/;

function matchContinentLiteral(name: string): Continent | null {
  for (const [pattern, continent] of CONTINENT_NAME_PATTERNS) {
    if (pattern.test(name)) return continent;
  }
  return null;
}

// Tries to resolve one raw component/group name to a continent, without
// looking at any parent — used for both a component's own name and (as a
// fallback) its parent group's name.
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

  return null;
}

// componentsById lets a child component (e.g. Cloudflare's "Amsterdam,
// Netherlands - (AMS)") inherit its continent from its parent group's name
// ("Europe") when its own name has no recognizable location in it. Only one
// level up — Statuspage groups aren't nested deeper than that in practice
// (a top-level group's own group_id is always null).
export function inferComponentContinent(
  component: StatuspageComponent,
  componentsById: Map<string, StatuspageComponent>,
): Continent | null {
  const parent = component.group_id ? componentsById.get(component.group_id) : undefined;

  // A parent group whose own name literally *is* a continent (how
  // Cloudflare organizes its regions) is a stronger signal than guessing
  // from the child's own city/country text — it's the provider's own
  // classification, not our heuristic. Matters most for transcontinental
  // countries: e.g. "Tbilisi, Georgia" resolves to Europe because
  // Cloudflare files it under their "Europe" group, even though
  // COUNTRY_TO_CONTINENT's own (necessarily arbitrary) pick for "Georgia"
  // alone is Asia.
  if (parent) {
    const parentLiteral = matchContinentLiteral(parent.name);
    if (parentLiteral) return parentLiteral;
  }

  const own = matchName(component.name);
  if (own) return own;

  if (parent) return matchName(parent.name);

  return null;
}
