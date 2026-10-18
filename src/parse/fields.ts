import type { Registrant, Registrar } from "#types.ts";

const REDACTED =
  /redacted|not disclosed|data protected|withheld|gdpr|not applicable|privacy|hidden upon|not shown|web-?based whois/i;

export function visible(value: string | undefined): string | undefined {
  return value === undefined || REDACTED.test(value) ? undefined : value;
}

export function countryCode(value: string | undefined): string | undefined {
  const country = visible(value)?.trim();
  return country !== undefined && /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : undefined;
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
  whoisServer?: string | undefined;
}

export function registrar(name: string, details: RegistrarDetails): Registrar {
  const { ianaId, url, whoisServer } = details;
  const abuseEmail = details.abuseEmail?.toLowerCase();
  const abusePhone = details.abusePhone?.replace(/^tel:/, "");
  return {
    name,
    ...(ianaId !== undefined && Number.isInteger(ianaId) && ianaId > 0 && { ianaId }),
    ...(url !== undefined && { url }),
    ...(abuseEmail?.includes("@") === true && { abuseEmail }),
    ...(abusePhone !== undefined && { abusePhone }),
    ...(whoisServer !== undefined && { whoisServer }),
  };
}

export function hostnames(values: string[]): string[] {
  const hosts = values
    .map((value) => (value.replace(/^\w+:\/\//, "").split(/[\s/]/)[0] ?? "").toLowerCase().replace(/\.$/, ""))
    .filter((host) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host));
  return [...new Set(hosts)];
}
