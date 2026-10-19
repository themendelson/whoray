import type { Contact, Registrar } from "#types.ts";

const REDACTED =
  /redacted|not disclosed|data protected|withheld|gdpr|not applicable|privacy|hidden upon|not shown|web-?based whois|^n\/a$|^personal information$|^not available$|^false$|\*{3,}|^private person$|^individual$|^not\.defined\.?$/i;

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
    .replace(/\s+(?:AT|en)\s+/, "@")
    .toLowerCase();
  return address !== undefined && EMAIL.test(address) ? address : undefined;
}

export function phone(value: string | undefined): string | undefined {
  const number = filled(value)?.replace(/^tel:/i, "");
  return number !== undefined && PHONE.test(number) ? number : undefined;
}

export type Details<T> = { [K in keyof T]?: T[K] | undefined };

export function defined<T extends object>(details: Details<T>): Partial<T> {
  const known: Partial<T> = {};
  for (const key in details) {
    const value = details[key];
    if (value !== undefined) known[key] = value;
  }
  return known;
}

export function contact(details: Details<Contact>): Contact | undefined {
  const known = defined({ ...details, street: details.street?.length === 0 ? undefined : details.street });
  return Object.keys(known).length > 0 ? known : undefined;
}

export function registrar(name: string, details: Details<Omit<Registrar, "name">>): Registrar {
  const { ianaId } = details;
  const abuseEmail = details.abuseEmail?.toLowerCase();
  return {
    name,
    ...defined({
      ...details,
      ianaId: ianaId !== undefined && Number.isInteger(ianaId) && ianaId > 0 ? ianaId : undefined,
      street: details.street?.length === 0 ? undefined : details.street,
      abuseEmail: abuseEmail?.includes("@") === true ? abuseEmail : undefined,
      abusePhone: details.abusePhone?.replace(/^tel:/, ""),
    }),
  };
}

export function hostnames(values: string[]): string[] {
  const hosts = values
    .map((value) => (value.replace(/^\w+:\/\//, "").split(/[\s/]/)[0] ?? "").toLowerCase().replace(/\.$/, ""))
    .filter((host) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host));
  return [...new Set(hosts)];
}
