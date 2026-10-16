import { normalize } from "#domain.ts";
import { readRdap } from "#parse/rdap.ts";
import { toRecord } from "#parse/record.ts";
import { readWhois } from "#parse/whois.ts";
import { isKnownSuffix } from "#tlds.ts";
import type { DomainRecord } from "#types.ts";

export type { Lookup } from "#lookup.ts";
export type * from "#types.ts";

export function parseWhois(text: string, domain: string): DomainRecord {
  const name = normalize(domain, isKnownSuffix);
  return toRecord(name, readWhois(text, name));
}

export function parseRdap(json: unknown, domain: string): DomainRecord {
  return toRecord(normalize(domain, isKnownSuffix), readRdap(json));
}
