import { normalize } from "#domain.ts";
import { isKnownSuffix } from "#lifecycle.ts";
import { toRecord } from "#parse/record.ts";
import { readRdap } from "#rdap/parse.ts";
import type { DomainRecord } from "#types.ts";
import { readWhois } from "#whois/parse.ts";

export type { Lookup } from "#lookup.ts";
export type * from "#types.ts";

export function parseWhois(text: string, domain: string): DomainRecord {
  const name = normalize(domain, isKnownSuffix);
  return toRecord(name, readWhois(text, name));
}

export function parseRdap(json: unknown, domain: string): DomainRecord {
  return toRecord(normalize(domain, isKnownSuffix), readRdap(json));
}
