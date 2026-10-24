// IOC country codes (as the ATP uses them) to flag emoji.

const IOC_TO_ISO: Record<string, string> = {
  ALG: "DZ", ARG: "AR", ARM: "AM", AUS: "AU", AUT: "AT", BAH: "BS", BAR: "BB", BEL: "BE", BIH: "BA", BLR: "BY",
  BOL: "BO", BRA: "BR", BUL: "BG", CAN: "CA", CHI: "CL", CHN: "CN", COL: "CO", CRC: "CR", CRO: "HR", CYP: "CY",
  CZE: "CZ", DEN: "DK", DOM: "DO", ECU: "EC", EGY: "EG", ESA: "SV", ESP: "ES", EST: "EE", FIN: "FI", FRA: "FR",
  GBR: "GB", GEO: "GE", GER: "DE", GRE: "GR", GUA: "GT", HKG: "HK", HON: "HN", HUN: "HU", INA: "ID", IND: "IN",
  IRI: "IR", IRL: "IE", ISR: "IL", ITA: "IT", JAM: "JM", JPN: "JP", KAZ: "KZ", KOR: "KR", KSA: "SA", LAT: "LV",
  LIB: "LB", LTU: "LT", LUX: "LU", MAR: "MA", MAS: "MY", MDA: "MD", MEX: "MX", MON: "MC", NED: "NL", NGR: "NG",
  NOR: "NO", NZL: "NZ", PAK: "PK", PAR: "PY", PER: "PE", PHI: "PH", POL: "PL", POR: "PT", PUR: "PR", QAT: "QA",
  ROU: "RO", RSA: "ZA", RUS: "RU", SGP: "SG", SLO: "SI", SRB: "RS", SRI: "LK", SUI: "CH", SVK: "SK", SWE: "SE",
  THA: "TH", TPE: "TW", TUN: "TN", TUR: "TR", UAE: "AE", UKR: "UA", URU: "UY", USA: "US", UZB: "UZ", VEN: "VE",
  ZIM: "ZW",
};

/** "SUI" → "🇨🇭"; empty for unknown codes. */
export function flag(ioc: string): string {
  const iso = IOC_TO_ISO[ioc];
  if (!iso) return "";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
