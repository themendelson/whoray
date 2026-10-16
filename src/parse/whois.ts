import type { Field } from "#data/aliases.ts";
import { aliases } from "#data/aliases.ts";
import { blocked, notFound, rateLimited, reserved, retired } from "#data/phrases.ts";
import { quirks } from "#data/quirks.ts";
import type { Name } from "#domain.ts";
import { lastLabel } from "#lifecycle.ts";
import { parseDate } from "#parse/dates.ts";
import type { Found } from "#parse/found.ts";
import { pairs } from "#parse/pairs.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Registrar } from "#types.ts";

const fieldByKey = new Map(aliases.flatMap(([field, keys]) => keys.map((key) => [key, field] as const)));
const REDACTED = /redacted|not disclosed|data protected|withheld|gdpr|not applicable|privacy/i;

export function readWhois(text: string, { domain, tld }: Name): Found {
  const transforms = quirks[tld] ?? quirks[lastLabel(tld)] ?? [];
  const fields = collect(transforms.reduce((current, transform) => transform(current), text));
  const created = firstDate(fields.get("created"));
  const updated = firstDate(fields.get("updated"));
  const expires = firstDate(fields.get("expires"));
  const released = firstDate(fields.get("released"));
  const registrar = registrarOf(fields);
  const nameservers = hostnames(fields.get("nameservers") ?? []).filter((host) => host !== domain);
  if (!created && !expires && !registrar && nameservers.length === 0) return withoutRecord(text);
  const registrarWhois = hostnames(fields.get("registrarWhois") ?? []).at(0);
  const dnssec = (fields.get("dnssec") ?? []).map(dnssecOf).find((value) => value !== undefined);
  return {
    kind: "record",
    statuses: normalizeStatuses(fields.get("statuses") ?? []),
    nameservers,
    ...(registrar && { registrar }),
    ...(created && { created }),
    ...(updated && { updated }),
    ...(expires && { expires }),
    ...(released && { released }),
    ...(dnssec !== undefined && { dnssec }),
    ...(registrarWhois !== undefined && { registrarWhois }),
  };
}

function collect(text: string): Map<Field, string[]> {
  const fields = new Map<Field, string[]>();
  for (const { key, value } of pairs(text)) {
    const field = fieldByKey.get(key);
    if (field) fields.set(field, [...(fields.get(field) ?? []), value]);
  }
  return fields;
}

function withoutRecord(text: string): Found {
  const matches = (phrases: RegExp[]): boolean => phrases.some((phrase) => phrase.test(text));
  if (matches(reserved)) return { kind: "reserved" };
  if (matches(notFound)) return { kind: "available" };
  if (matches(rateLimited))
    return { kind: "error", code: "rate_limited", message: "The server is rate limiting queries" };
  if (matches(blocked)) return { kind: "error", code: "blocked", message: "The server refused this client" };
  if (matches(retired))
    return { kind: "error", code: "no_server", message: "The server no longer answers for this TLD" };
  return { kind: "error", code: "unparseable", message: "No registration data or known not-found reply" };
}

function firstDate(values: string[] | undefined): Date | undefined {
  for (const value of values ?? []) {
    const date = parseDate(value);
    if (date) return date;
  }
  return undefined;
}

function present(values: string[] | undefined): string | undefined {
  return values?.find((value) => !REDACTED.test(value));
}

function registrarOf(fields: Map<Field, string[]>): Registrar | undefined {
  const raw = present(fields.get("registrar"));
  if (raw === undefined) return undefined;
  const inline = /^(.*?)\s*\(\s*(https?:\/\/[^\s)]+)\s*\)$/.exec(raw);
  const name = inline?.[1] ?? raw;
  const url = present(fields.get("registrarUrl")) ?? inline?.[2];
  const ianaId = Number(fields.get("registrarIanaId")?.[0]);
  const abuseEmail = present(fields.get("abuseEmail"))?.toLowerCase();
  return {
    name,
    ...(Number.isInteger(ianaId) && ianaId > 0 && { ianaId }),
    ...(url !== undefined && { url }),
    ...(abuseEmail?.includes("@") === true && { abuseEmail }),
  };
}

function hostnames(values: string[]): string[] {
  const hosts = values
    .map((value) => (value.replace(/^\w+:\/\//, "").split(/[\s/]/)[0] ?? "").toLowerCase().replace(/\.$/, ""))
    .filter((host) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host));
  return [...new Set(hosts)];
}

function dnssecOf(value: string): boolean | undefined {
  if (/unsigned|^no\b|inactive|false/i.test(value)) return false;
  if (/signed|^yes\b|active|true/i.test(value)) return true;
  return undefined;
}
