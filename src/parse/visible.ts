import type { Registrant } from "#types.ts";

const REDACTED = /redacted|not disclosed|data protected|withheld|gdpr|not applicable|privacy|hidden upon/i;

export function visible(value: string | undefined): string | undefined {
  return value === undefined || REDACTED.test(value) ? undefined : value;
}

export function countryCode(value: string | undefined): string | undefined {
  const country = visible(value)?.trim();
  return country !== undefined && /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : country;
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
