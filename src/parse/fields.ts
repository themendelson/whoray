import { countryAliases } from "#data/countries.ts";
import type { Registrant, Registrar } from "#types.ts";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const REDACTED = /redacted|not disclosed|data protected|withheld|gdpr|not applicable|privacy|hidden upon/i;

export function visible(value: string | undefined): string | undefined {
  return value === undefined || REDACTED.test(value) ? undefined : value;
}

interface Countries {
  byName: ReadonlyMap<string, string>;
  codes: ReadonlySet<string>;
}

let countries: Countries | undefined;

function loadCountries(): Countries {
  const display = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
  const byName = new Map(Object.entries(countryAliases));
  const codes = new Set<string>();
  for (const first of LETTERS) {
    for (const second of LETTERS) {
      const code = `${first}${second}`;
      const name = display.of(code);
      if (name === undefined) continue;
      byName.set(name.toLowerCase(), code);
      codes.add(code);
    }
  }
  return { byName, codes };
}

export function countryCode(value: string | undefined): string | undefined {
  const country = visible(value)?.trim();
  if (country === undefined) return undefined;
  countries ??= loadCountries();
  const code = countries.byName.get(country.toLowerCase()) ?? country.toUpperCase();
  return countries.codes.has(code) ? code : undefined;
}

export function registrant(
  name: string | undefined,
  organization: string | undefined,
  country: string | undefined,
): Registrant | undefined {
  const known = {
    ...(name !== undefined && { name }),
    ...(organization !== undefined && { organization }),
    ...(country !== undefined && { country }),
  };
  return Object.keys(known).length > 0 ? known : undefined;
}

interface RegistrarDetails {
  ianaId?: number | undefined;
  url?: string | undefined;
  abuseEmail?: string | undefined;
  abusePhone?: string | undefined;
}

export function registrar(name: string, details: RegistrarDetails): Registrar {
  const { ianaId, url } = details;
  const abuseEmail = details.abuseEmail?.toLowerCase();
  const abusePhone = details.abusePhone?.replace(/^tel:/, "");
  return {
    name,
    ...(ianaId !== undefined && Number.isInteger(ianaId) && ianaId > 0 && { ianaId }),
    ...(url !== undefined && { url }),
    ...(abuseEmail?.includes("@") === true && { abuseEmail }),
    ...(abusePhone !== undefined && { abusePhone }),
  };
}

export function hostnames(values: string[]): string[] {
  const hosts = values
    .map((value) => (value.replace(/^\w+:\/\//, "").split(/[\s/]/)[0] ?? "").toLowerCase().replace(/\.$/, ""))
    .filter((host) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host));
  return [...new Set(hosts)];
}
