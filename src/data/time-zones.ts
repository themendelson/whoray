// These registries publish WHOIS dates without a zone, in local time; their RDAP gives the same instants in UTC.
export const whoisTimeZones: Readonly<Record<string, string>> = {
  cz: "Europe/Prague",
  fi: "Europe/Helsinki",
  kg: "Asia/Bishkek",
  kr: "Asia/Seoul",
  pl: "Europe/Warsaw",
  tz: "Africa/Dar_es_Salaam",
};
