import type { Field } from "#data/aliases.ts";
import { aliases } from "#data/aliases.ts";
import { blocked, firstLine, notFound, rateLimited, reserved, retired, revoked } from "#data/phrases.ts";
import { quirks } from "#data/quirks.ts";
import type { Name } from "#domain.ts";
import { lastLabel, registryInText } from "#lifecycle.ts";
import { parseDate } from "#parse/dates.ts";
import type { Found, Registration } from "#parse/found.ts";
import { pairs } from "#parse/pairs.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import { countryCode, registrant, visible } from "#parse/visible.ts";
import type { Registrant, Registrar } from "#types.ts";

const fieldByKey = new Map(aliases.flatMap(([field, keys]) => keys.map((key) => [key, field] as const)));

export function readWhois(text: string, name: Name): Found {
  const transforms = quirks[name.tld] ?? quirks[lastLabel(name.tld)] ?? [];
  const fields = collect(transforms.reduce((current, transform) => transform(current), text));
  const created = firstDate(fields.get("created"));
  const expires = firstDate(fields.get("expires"));
  const registrar = registrarOf(fields);
  const nameservers = hostnames(fields.get("nameservers") ?? []).filter((host) => host !== name.domain);
  if (!created && !expires && !registrar && nameservers.length === 0) return withoutRecord(text);
  return {
    kind: "record",
    statuses: statusesOf(fields, text),
    nameservers,
    ...(registrar && { registrar }),
    ...(created && { created }),
    ...(expires && { expires }),
    ...details(fields, text),
  };
}

function statusesOf(fields: Map<Field, string[]>, text: string): string[] {
  const statuses = normalizeStatuses(fields.get("statuses") ?? []);
  return revoked.test(text) && !statuses.includes("pendingDelete") ? [...statuses, "pendingDelete"] : statuses;
}

function details(fields: Map<Field, string[]>, text: string): Partial<Registration> {
  const updated = firstDate(fields.get("updated"));
  const released = firstDate(fields.get("released"));
  const deleted = firstDate(fields.get("deleted"));
  const database = parseDate(/>>> Last update of WHOIS database:\s*(\S+)/i.exec(text)?.[1] ?? "");
  const registrarWhois = hostnames(fields.get("registrarWhois") ?? []).at(0);
  const dnssec = (fields.get("dnssec") ?? []).map(dnssecOf).find((value) => value !== undefined);
  const holder = registrantOf(fields);
  const handle = visible(fields.get("handle")?.[0]);
  const registryId = registryInText(text)?.id;
  return {
    ...(holder && { registrant: holder }),
    ...(handle !== undefined && { handle }),
    ...(updated && { updated }),
    ...(released && { released }),
    ...(deleted && { deleted }),
    ...(database && { database }),
    ...(dnssec !== undefined && { dnssec }),
    ...(registrarWhois !== undefined && { registrarWhois }),
    ...(registryId !== undefined && { registryId }),
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
  const opening = text.trim().split(/\r?\n/)[0] ?? "";
  if (firstLine.dropzone.test(opening)) return { kind: "dropzone" };
  if (firstLine.dpml.test(opening) || matches(reserved)) return { kind: "reserved" };
  if (matches(notFound)) return { kind: "available", ...(firstLine.premium.test(opening) && { premium: true }) };
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
  return values?.find((value) => visible(value) !== undefined);
}

function registrantOf(fields: Map<Field, string[]>): Registrant | undefined {
  return registrant(
    present(fields.get("registrantName")),
    present(fields.get("registrantOrganization")),
    countryCode(present(fields.get("registrantCountry"))),
  );
}

function registrarOf(fields: Map<Field, string[]>): Registrar | undefined {
  const raw = present(fields.get("registrar"));
  if (raw === undefined) return undefined;
  const inline = /^(.*?)\s*\(\s*(https?:\/\/[^\s)]+)\s*\)$/.exec(raw);
  const name = inline?.[1] ?? raw;
  const url = present(fields.get("registrarUrl")) ?? inline?.[2];
  const ianaId = Number(fields.get("registrarIanaId")?.[0]);
  const abuseEmail = present(fields.get("abuseEmail"))?.toLowerCase();
  const abusePhone = present(fields.get("abusePhone"));
  return {
    name,
    ...(Number.isInteger(ianaId) && ianaId > 0 && { ianaId }),
    ...(url !== undefined && { url }),
    ...(abuseEmail?.includes("@") === true && { abuseEmail }),
    ...(abusePhone !== undefined && { abusePhone }),
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
