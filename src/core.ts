import { normalize } from "#domain.ts";
import { isKnownSuffix } from "#lookup.ts";
import { readRdap } from "#parse/rdap.ts";
import { toRecord } from "#parse/record.ts";
import { readWhois } from "#parse/whois.ts";
import type { DomainRecord } from "#types.ts";

export function parseWhois(text: string, domain: string): DomainRecord {
  const name = normalize(domain, (suffix) => isKnownSuffix(suffix));
  return toRecord(name, readWhois(text, name));
}

export function parseRdap(json: unknown, domain: string): DomainRecord {
  return toRecord(
    normalize(domain, (suffix) => isKnownSuffix(suffix)),
    readRdap(json),
  );
}
