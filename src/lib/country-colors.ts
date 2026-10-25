// Two colors from each country's flag (IOC codes, as the ATP uses them), for
// the default card art. The first is never white; unknown codes get the
// card's own blue and gold.

const COLORS: Record<string, [string, string]> = {
  ARG: ["#74acdf", "#f6b40e"], ARM: ["#d90012", "#f2a800"], AUS: ["#00843d", "#ffcd00"], AUT: ["#c8102e", "#ffffff"],
  BEL: ["#fdda24", "#ef3340"], BIH: ["#002395", "#fecb00"], BLR: ["#c8313e", "#4aa657"], BOL: ["#d52b1e", "#007934"],
  BRA: ["#009c3b", "#ffdf00"], BUL: ["#00966e", "#d62612"], CAN: ["#d80621", "#ffffff"], CHI: ["#d52b1e", "#0039a6"],
  CHN: ["#de2910", "#ffde00"], COL: ["#fcd116", "#003893"], CRC: ["#002b7f", "#ce1126"], CRO: ["#e2001a", "#171796"],
  CYP: ["#d57800", "#4e5b31"], CZE: ["#11457e", "#d7141a"], DEN: ["#c8102e", "#ffffff"], DOM: ["#002d62", "#ce1126"],
  ECU: ["#ffdd00", "#034ea2"], ESP: ["#aa151b", "#f1bf00"], EST: ["#0072ce", "#1f2233"], FIN: ["#002f6c", "#ffffff"],
  FRA: ["#002395", "#ed2939"], GBR: ["#012169", "#c8102e"], GEO: ["#ff0000", "#ffffff"], GER: ["#ffce00", "#dd0000"],
  GRE: ["#0d5eaf", "#ffffff"], HKG: ["#de2910", "#ffffff"], HUN: ["#ce2939", "#477050"], IND: ["#ff9933", "#138808"],
  ISR: ["#0038b8", "#ffffff"], ITA: ["#009246", "#ce2b37"], JAM: ["#009b3a", "#fed100"], JPN: ["#bc002d", "#ffffff"],
  KAZ: ["#00afca", "#fec50c"], KOR: ["#cd2e3a", "#0047a0"], LAT: ["#9e3039", "#ffffff"], LTU: ["#fdb913", "#006a44"],
  LUX: ["#ed2939", "#00a1de"], MAR: ["#c1272d", "#006233"], MDA: ["#0046ae", "#ffd200"], MEX: ["#006847", "#ce1126"],
  MON: ["#ce1126", "#ffffff"], NED: ["#ff7f00", "#21468b"], NOR: ["#ba0c2f", "#00205b"], NZL: ["#00247d", "#cc142b"],
  PAR: ["#d52b1e", "#0038a8"], PER: ["#d91023", "#ffffff"], PHI: ["#0038a8", "#ce1126"], POL: ["#dc143c", "#ffffff"],
  POR: ["#006600", "#ff0000"], ROU: ["#002b7f", "#fcd116"], RSA: ["#007a4d", "#ffb612"], RUS: ["#0039a6", "#d52b1e"],
  SLO: ["#005ce5", "#ed1c24"], SRB: ["#c6363c", "#0c4076"], SUI: ["#da291c", "#ffffff"], SVK: ["#0b4ea2", "#ee1c25"],
  SWE: ["#006aa7", "#fecc00"], THA: ["#2d2a4a", "#a51931"], TPE: ["#000095", "#fe0000"], TUN: ["#e70013", "#ffffff"],
  TUR: ["#e30a17", "#ffffff"], UKR: ["#0057b7", "#ffd700"], URU: ["#0038a8", "#fcd116"], USA: ["#3c3b6e", "#b22234"],
  UZB: ["#0099b5", "#1eb53a"], ZIM: ["#006400", "#ffd200"],
};

/** "SUI" → ["#da291c", "#ffffff"]. */
export function countryColors(ioc: string): [string, string] {
  return COLORS[ioc] ?? ["#1f4aa0", "#f4b81c"];
}
