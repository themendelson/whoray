import type { Registrant, Registrar } from "#types.ts";

const REDACTED =
  /redacted|not disclosed|data protected|withheld|gdpr|not applicable|privacy|hidden upon|not shown|web-?based whois|^n\/a$/i;

export function visible(value: string | undefined): string | undefined {
  return value === undefined || REDACTED.test(value) ? undefined : value;
}

export function countryCode(value: string | undefined): string | undefined {
  const country = visible(value)?.trim();
  return country !== undefined && /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : undefined;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s.()-]{5,}(?:\s*(?:x|ext\.?)\s*\d+)?$/i;

export function filled(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : visible(trimmed);
}

export function email(value: string | undefined): string | undefined {
  const address = filled(value)
    ?.replace(/^mailto:/i, "")
    .toLowerCase();
  return address !== undefined && EMAIL.test(address) ? address : undefined;
}

export function phone(value: string | undefined): string | undefined {
  const number = filled(value)?.replace(/^tel:/i, "");
  return number !== undefined && PHONE.test(number) ? number : undefined;
}

interface RegistrantDetails {
  name?: string | undefined;
  organization?: string | undefined;
  street?: string[] | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
}

export function registrant(details: RegistrantDetails): Registrant | undefined {
  const { name, organization, street, city, state, postalCode, country } = details;
  const known = {
    ...(name !== undefined && { name }),
    ...(organization !== undefined && { organization }),
    ...(street !== undefined && street.length > 0 && { street }),
    ...(city !== undefined && { city }),
    ...(state !== undefined && { state }),
    ...(postalCode !== undefined && { postalCode }),
    ...(country !== undefined && { country }),
    ...(details.email !== undefined && { email: details.email }),
    ...(details.phone !== undefined && { phone: details.phone }),
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
